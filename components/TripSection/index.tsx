'use client'

import { useCallback, useEffect, useState } from 'react'
import { App, Button, Empty, Popconfirm, Skeleton, Tag } from 'antd'
import { CalendarOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import type { Trip, TripStatus } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import TripForm from './TripForm'
import styles from './index.module.scss'

const STATUS_LABELS: Record<TripStatus, string> = {
  PLANNING: '规划中',
  UPCOMING: '即将出发',
  ACTIVE: '旅行中',
  COMPLETED: '已结束',
}

const STATUS_COLORS: Record<TripStatus, string> = {
  PLANNING: 'default',
  UPCOMING: 'blue',
  ACTIVE: 'green',
  COMPLETED: 'default',
}

function formatDateRange(trip: Trip) {
  const start = new Date(`${trip.startDate}T00:00:00`)
  const end = new Date(`${trip.endDate}T00:00:00`)
  const startText = `${start.getMonth() + 1}月${start.getDate()}日`
  const endText = `${end.getMonth() + 1}月${end.getDate()}日`
  return start.getFullYear() === end.getFullYear()
    ? `${start.getFullYear()}年 ${startText}—${endText}`
    : `${trip.startDate} — ${trip.endDate}`
}

export default function TripSection() {
  const { message } = App.useApp()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(withBasePath('/api/trips'))
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '加载失败')
      setTrips(result.data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '行程加载失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => { void fetchTrips() }, [fetchTrips])

  const openCreate = () => {
    setEditingTrip(null)
    setFormOpen(true)
  }

  const openEdit = (trip: Trip) => {
    setEditingTrip(trip)
    setFormOpen(true)
  }

  const submitTrip = async (payload: {
    name: string
    startDate: string
    endDate: string
    cities: string[]
    notes: string | null
  }) => {
    setSubmitting(true)
    try {
      const response = await fetch(
        editingTrip ? withBasePath(`/api/trips/${editingTrip.id}`) : withBasePath('/api/trips'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '保存失败')
      message.success(editingTrip ? '行程已更新' : '行程已创建')
      setFormOpen(false)
      await fetchTrips()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteTrip = async (trip: Trip) => {
    const response = await fetch(withBasePath(`/api/trips/${trip.id}`), { method: 'DELETE' })
    if (response.ok) {
      message.success('行程已删除，关联的交通记录仍然保留')
      await fetchTrips()
    } else {
      message.error('删除失败，请重试')
    }
  }

  return (
    <section className={styles.section} id="trips">
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>MY JOURNEYS</span>
          <h1>我的行程</h1>
          <p>把每一次旅行作为一个项目，从计划到出发都收在一起。</p>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate}>
          创建新行程
        </Button>
      </div>

      {loading ? (
        <div className={styles.grid}><Skeleton active /><Skeleton active /></div>
      ) : trips.length === 0 ? (
        <div className={styles.empty}>
          <Empty description="还没有行程，从下一次出发开始吧">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建第一个行程</Button>
          </Empty>
        </div>
      ) : (
        <div className={styles.grid}>
          {trips.map((trip, index) => (
            <article className={styles.card} key={trip.id}>
              <a className={styles.cardLink} href={withBasePath(`/trips/${trip.id}`)} aria-label={`打开行程：${trip.name}`}>
                <div className={styles.cardTop}>
                  <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                  <Tag color={STATUS_COLORS[trip.status]}>{STATUS_LABELS[trip.status]}</Tag>
                </div>
                <h2>{trip.name}</h2>
                <div className={styles.meta}>
                  <span><CalendarOutlined />{formatDateRange(trip)}</span>
                  <span><EnvironmentOutlined />{trip.cities.join(' → ')}</span>
                </div>
                <div className={styles.stats}>
                  <span><strong>{trip.transportCount}</strong> 项交通</span>
                  <span><strong>{trip.orderCount}</strong> 张已出票</span>
                  <span><strong>{trip.waitlistCount}</strong> 个候补</span>
                </div>
              </a>
              <div className={styles.actions}>
                <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(trip)}>编辑</Button>
                <Popconfirm
                  title="删除这个行程？"
                  description="交通记录不会被删除，只会解除关联。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteTrip(trip)}
                >
                  <Button type="text" danger>删除</Button>
                </Popconfirm>
              </div>
            </article>
          ))}
        </div>
      )}

      <TripForm
        open={formOpen}
        trip={editingTrip}
        submitting={submitting}
        onCancel={() => setFormOpen(false)}
        onSubmit={submitTrip}
      />
    </section>
  )
}
