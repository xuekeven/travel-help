'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Empty, Modal, Skeleton, Switch, Tag } from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EditOutlined,
  LinkOutlined,
  SwapRightOutlined,
} from '@ant-design/icons'
import type { Trip, TripStatus, TripTransportItem, TripTransportKind } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import RealtimeClock from '@/components/RealtimeClock'
import TravelAppProvider from '@/components/TravelAppProvider'
import TripForm from '@/components/TripSection/TripForm'
import styles from './index.module.scss'

const STATUS_LABELS: Record<TripStatus, string> = {
  PLANNING: '规划中',
  UPCOMING: '即将出发',
  ACTIVE: '旅行中',
  COMPLETED: '已结束',
}
const KIND_LABELS: Record<TripTransportKind, string> = {
  PLAN: '购票计划',
  ORDER: '已出票',
  WAITLIST: '候补',
}
const KIND_COLORS: Record<TripTransportKind, string> = {
  PLAN: 'orange',
  ORDER: 'blue',
  WAITLIST: 'purple',
}
function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T00:00:00`))
}

function TripDetailContent({ tripId }: { tripId: string }) {
  const { message } = App.useApp()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [transport, setTransport] = useState<TripTransportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [transportOpen, setTransportOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [linkingKey, setLinkingKey] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tripResponse, transportResponse] = await Promise.all([
        fetch(withBasePath(`/api/trips/${tripId}`)),
        fetch(withBasePath(`/api/trips/${tripId}/transport`)),
      ])
      const tripResult = await tripResponse.json()
      const transportResult = await transportResponse.json()
      if (!tripResponse.ok) throw new Error(tripResult.error || '行程加载失败')
      if (!transportResponse.ok) throw new Error(transportResult.error || '交通记录加载失败')
      setTrip(tripResult.data)
      setTransport(transportResult.data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '行程加载失败')
    } finally {
      setLoading(false)
    }
  }, [message, tripId])

  useEffect(() => { void loadData() }, [loadData])

  const timeline = useMemo(() => {
    const groups = new Map<string, TripTransportItem[]>()
    transport.filter((item) => item.linked).forEach((item) => {
      const group = groups.get(item.date) ?? []
      group.push(item)
      groups.set(item.date, group)
    })
    return Array.from(groups.entries())
  }, [transport])

  const saveTrip = async (payload: {
    name: string
    startDate: string
    endDate: string
    cities: string[]
    notes: string | null
  }) => {
    setSubmitting(true)
    try {
      const response = await fetch(withBasePath(`/api/trips/${tripId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '保存失败')
      setTrip(result.data)
      setEditOpen(false)
      message.success('行程已更新')
      await loadData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTransport = async (item: TripTransportItem, linked: boolean) => {
    const key = `${item.kind}:${item.id}`
    setLinkingKey(key)
    try {
      const response = await fetch(withBasePath(`/api/trips/${tripId}/transport`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: item.kind, recordId: item.id, linked }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '关联失败')
      setTransport((current) => current.map((entry) =>
        entry.id === item.id && entry.kind === item.kind ? { ...entry, linked } : entry
      ))
      setTrip((current) => {
        if (!current) return current
        const delta = linked ? 1 : -1
        return {
          ...current,
          transportCount: Math.max(0, current.transportCount + delta),
          planCount: item.kind === 'PLAN' ? Math.max(0, current.planCount + delta) : current.planCount,
          orderCount: item.kind === 'ORDER' ? Math.max(0, current.orderCount + delta) : current.orderCount,
          waitlistCount: item.kind === 'WAITLIST' ? Math.max(0, current.waitlistCount + delta) : current.waitlistCount,
        }
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '关联失败')
    } finally {
      setLinkingKey(null)
    }
  }

  if (loading) {
    return <main className={styles.main}><Skeleton active paragraph={{ rows: 10 }} /></main>
  }

  if (!trip) {
    return (
      <main className={styles.main}>
        <Empty description="没有找到这个行程">
          <a href={withBasePath('/')}><Button>返回我的行程</Button></a>
        </Empty>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <a className={styles.brand} href={withBasePath('/')}>
          <span className={styles.brandMark} aria-hidden>⌁</span>
          <span><strong>Travel Help</strong><small>旅行助手</small></span>
        </a>
        <nav>
          <a href="#overview">总览</a>
          <a href="#timeline">日程</a>
          <a href="#timeline">交通</a>
          <span className={styles.disabled}>行李</span>
        </nav>
        <RealtimeClock />
      </header>

      <section className={styles.hero}>
        <a className={styles.back} href={withBasePath('/')}><ArrowLeftOutlined /> 我的行程</a>
        <div className={styles.heroMain}>
          <div>
            <Tag color="blue">{STATUS_LABELS[trip.status]}</Tag>
            <h1>{trip.name}</h1>
            <p><CalendarOutlined /> {trip.startDate} — {trip.endDate}</p>
          </div>
          <Button size="large" icon={<EditOutlined />} onClick={() => setEditOpen(true)}>编辑行程</Button>
        </div>
        <div className={styles.route}>
          {trip.cities.map((city, index) => (
            <span key={`${city}-${index}`}>
              <strong>{city}</strong>
              {index < trip.cities.length - 1 && <SwapRightOutlined />}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.summary} id="overview">
        <article>
          <span>旅行天数</span>
          <strong>{Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1}</strong>
          <small>天</small>
        </article>
        <article>
          <span>城市</span>
          <strong>{trip.cities.length}</strong>
          <small>站</small>
        </article>
        <article>
          <span>交通安排</span>
          <strong>{trip.transportCount}</strong>
          <small>项</small>
        </article>
        <article>
          <span>已出票</span>
          <strong>{trip.orderCount}</strong>
          <small>张订单</small>
        </article>
      </section>

      <div className={`${styles.contentGrid} ${trip.notes ? '' : styles.singleColumn}`}>
        <section className={styles.panel} id="timeline">
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>ITINERARY</span><h2>按天行程</h2></div>
          </div>
          {timeline.length === 0 ? (
            <div className={styles.emptyTimeline}>
              <Empty description="还没有关联交通记录">
                <Button icon={<LinkOutlined />} onClick={() => setTransportOpen(true)}>从现有记录中关联</Button>
              </Empty>
            </div>
          ) : timeline.map(([date, items], dayIndex) => (
            <div className={styles.day} key={date}>
              <div className={styles.dayLabel}><b>DAY {String(dayIndex + 1).padStart(2, '0')}</b><span>{formatLongDate(date)}</span></div>
              <div className={styles.dayItems}>
                {items.map((item) => (
                  <article className={styles.timelineItem} key={`${item.kind}-${item.id}`}>
                    <time>{item.time || '待定'}</time>
                    <div className={styles.dot} />
                    <div>
                      <Tag color={KIND_COLORS[item.kind]}>{KIND_LABELS[item.kind]}</Tag>
                      <h3>{item.fromStation} <SwapRightOutlined /> {item.toStation}</h3>
                      <p>{item.code ? `${item.code} · ` : ''}{item.status}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        {trip.notes && (
          <aside className={styles.side}>
            <section className={styles.note}><span>行程备注</span><p>{trip.notes}</p></section>
          </aside>
        )}
      </div>


      <Modal
        title="关联交通记录"
        open={transportOpen}
        footer={null}
        width={680}
        onCancel={() => setTransportOpen(false)}
      >
        <p className={styles.modalHint}>显示行程日期范围内尚未归属的记录，以及已经关联到本行程的记录。</p>
        <div className={styles.transportList}>
          {transport.length === 0 ? <Empty description="该日期范围内没有可关联的交通记录" /> : transport.map((item) => {
            const key = `${item.kind}:${item.id}`
            return (
              <div className={styles.transportRow} key={key}>
                <div>
                  <Tag color={KIND_COLORS[item.kind]}>{KIND_LABELS[item.kind]}</Tag>
                  <strong>{item.date} · {item.fromStation} → {item.toStation}</strong>
                  <span>{item.time || '时间待定'}{item.code ? ` · ${item.code}` : ''}</span>
                </div>
                <Switch
                  checked={item.linked}
                  loading={linkingKey === key}
                  checkedChildren="已关联"
                  unCheckedChildren="关联"
                  onChange={(checked) => toggleTransport(item, checked)}
                />
              </div>
            )
          })}
        </div>
      </Modal>

      <TripForm
        open={editOpen}
        trip={trip}
        submitting={submitting}
        onCancel={() => setEditOpen(false)}
        onSubmit={saveTrip}
      />
    </main>
  )
}

export default function TripDetail({ tripId }: { tripId: string }) {
  return <TravelAppProvider><TripDetailContent tripId={tripId} /></TravelAppProvider>
}
