'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  App,
  Button,
  Empty,
  Popconfirm,
  Segmented,
  Skeleton,
  Tag,
} from 'antd'
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { PlaceCategory, PlaceVisitStatus, TripPlace } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import PlaceForm, { type PlacePayload } from './PlaceForm'
import styles from './index.module.scss'

const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => <Skeleton.Node active className={styles.mapLoading} />,
})

const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  FOOD: '美食',
  ATTRACTION: '景点',
  HOTEL: '酒店',
  TRANSPORT: '交通',
  SHOPPING: '购物',
  OTHER: '其他',
}
const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  FOOD: 'volcano',
  ATTRACTION: 'blue',
  HOTEL: 'purple',
  TRANSPORT: 'green',
  SHOPPING: 'orange',
  OTHER: 'default',
}
const STATUS_LABELS: Record<PlaceVisitStatus, string> = {
  WISHLIST: '想去',
  PLANNED: '已安排',
  VISITED: '已去',
}

type FilterValue = 'ALL' | PlaceCategory

export default function TripPlaces({
  tripId,
  tripCities,
  tripStartDate,
  tripEndDate,
  onPlacesChange,
}: {
  tripId: string
  tripCities: string[]
  tripStartDate: string
  tripEndDate: string
  onPlacesChange?: (places: TripPlace[]) => void
}) {
  const { message } = App.useApp()
  const [places, setPlaces] = useState<TripPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterValue>('ALL')
  const [pickMode, setPickMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState<TripPlace | null>(null)
  const [pickedPosition, setPickedPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(withBasePath(`/api/trips/${tripId}/places`))
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '地点加载失败')
      setPlaces(result.data)
      onPlacesChange?.(result.data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '地点加载失败')
    } finally {
      setLoading(false)
    }
  }, [message, onPlacesChange, tripId])

  useEffect(() => { void fetchPlaces() }, [fetchPlaces])

  const filteredPlaces = useMemo(
    () => filter === 'ALL' ? places : places.filter((place) => place.category === filter),
    [filter, places]
  )

  const handleMapPick = (latitude: number, longitude: number) => {
    setPickMode(false)
    setEditingPlace(null)
    setPickedPosition({ latitude, longitude })
    setFormOpen(true)
  }

  const openEdit = (place: TripPlace) => {
    setEditingPlace(place)
    setPickedPosition(null)
    setFormOpen(true)
  }

  const savePlace = async (payload: PlacePayload) => {
    setSubmitting(true)
    try {
      const path = editingPlace
        ? `/api/trips/${tripId}/places/${editingPlace.id}`
        : `/api/trips/${tripId}/places`
      const response = await fetch(withBasePath(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '保存失败')
      message.success(editingPlace ? '地点已更新' : '地点已加入行程')
      setFormOpen(false)
      await fetchPlaces()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const deletePlace = async (place: TripPlace) => {
    const response = await fetch(withBasePath(`/api/trips/${tripId}/places/${place.id}`), {
      method: 'DELETE',
    })
    if (!response.ok) {
      message.error('删除失败，请重试')
      return
    }
    message.success('地点已删除')
    await fetchPlaces()
  }

  return (
    <section className={styles.section} id="map">
      <div className={styles.heading}>
        <div>
          <span>PLACES & MAP</span>
          <h2>地点与地图</h2>
          <p>收藏美食和景点，安排到具体日期；点击地图完成选点。</p>
        </div>
        <Button
          type={pickMode ? 'default' : 'primary'}
          icon={<PlusOutlined />}
          onClick={() => setPickMode((current) => !current)}
        >
          {pickMode ? '取消选点' : '地图选点添加'}
        </Button>
      </div>

      {pickMode && <div className={styles.pickHint}><EnvironmentOutlined /> 请在地图上点击要收藏的位置</div>}

      <div className={styles.mapWrap}>
        <TripMap places={filteredPlaces} pickMode={pickMode} onPick={handleMapPick} />
      </div>
      <div className={styles.mapMeta}>
        <span>地图数据 © OpenStreetMap contributors</span>
        <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">报告地图问题</a>
      </div>

      <div className={styles.toolbar}>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as FilterValue)}
          options={[
            { value: 'ALL', label: `全部 ${places.length}` },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
              value,
              label: `${label} ${places.filter((place) => place.category === value).length}`,
            })),
          ]}
        />
      </div>

      {loading ? (
        <div className={styles.grid}><Skeleton active /><Skeleton active /></div>
      ) : filteredPlaces.length === 0 ? (
        <div className={styles.empty}>
          <Empty description={places.length ? '当前分类下没有地点' : '还没有收藏地点，点击“地图选点添加”开始'} />
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredPlaces.map((place) => (
            <article className={styles.card} key={place.id}>
              <div className={styles.cardTop}>
                <div>
                  <Tag color={CATEGORY_COLORS[place.category]}>{CATEGORY_LABELS[place.category]}</Tag>
                  <Tag>{STATUS_LABELS[place.visitStatus]}</Tag>
                </div>
                <div>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(place)} />
                  <Popconfirm
                    title="删除这个地点？"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deletePlace(place)}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
              <h3>{place.name}</h3>
              <p className={styles.address}><EnvironmentOutlined /> {place.city || '未填写城市'}{place.address ? ` · ${place.address}` : ''}</p>
              {place.plannedDate && (
                <p className={styles.schedule}><CalendarOutlined /> {place.plannedDate}{place.plannedTime ? ` ${place.plannedTime}` : ''}</p>
              )}
              {place.notes && <p className={styles.notes}>{place.notes}</p>}
              {place.guideUrl && (
                <a className={styles.guideLink} href={place.guideUrl} target="_blank" rel="noreferrer">
                  <LinkOutlined /> 打开攻略
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <PlaceForm
        open={formOpen}
        place={editingPlace}
        pickedPosition={pickedPosition}
        tripCities={tripCities}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        submitting={submitting}
        onCancel={() => setFormOpen(false)}
        onSubmit={savePlace}
      />
    </section>
  )
}
