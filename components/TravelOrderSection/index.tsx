'use client'
import { useCallback, useEffect, useState } from 'react'
import { Empty, Spin, Typography } from 'antd'
import type { TravelOrder } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import { formatDateTimeShanghai } from '@/lib/date'
import SortPillControls from '@/components/SortPillControls'
import styles from './index.module.scss'

function joinUnique(values: string[]) {
  return [...new Set(values.filter(Boolean))].join('、')
}

function formatPrice(price: number) {
  return `¥${Number(price).toFixed(1)}`
}

function getSeatTypeLabel(order: TravelOrder) {
  return joinUnique(order.ticketSnapshots.map((item) => item.seatTypeName)) || joinUnique(order.seatTypeNames) || '-'
}

function getSeatNoLabel(order: TravelOrder) {
  const seats = order.ticketSnapshots.map((item) => {
    const coach = item.coachName ? `${item.coachName}车` : ''
    const seat = item.seatName
      ? item.seatName.endsWith('号')
        ? item.seatName
        : `${item.seatName}号`
      : ''
    return `${coach}${seat}`.trim()
  })
  return joinUnique(seats) || joinUnique(order.seatNames) || '-'
}

function getTicketTypeLabel(order: TravelOrder) {
  return joinUnique(order.ticketTypeNames) || '成人票'
}

function getPassengers(order: TravelOrder) {
  return joinUnique(order.passengerNames) || '-'
}

function OrderCard({ order }: { order: TravelOrder }) {
  return (
    <article className={styles.orderCard}>
      <div className={styles.orderMeta}>
        <span>出行日期：{order.displayDate}</span>
        <span>订票日期：{order.orderDate.slice(0, 10)}</span>
        <span>订单号：{order.orderNo}</span>
      </div>
      <div className={styles.orderBody}>
        <div className={styles.trainCell}>
          <div className={styles.journeyGrid}>
            <span className={styles.trainCode}>{order.trainCode}</span>
            <div className={styles.stationBlock}>
              <div className={styles.stationName}>{order.fromStation}</div>
            </div>
            <span className={styles.routeArrow}>→</span>
            <div className={styles.stationBlock}>
              <div className={styles.stationName}>{order.toStation}</div>
            </div>
            <span className={styles.timeLine}>{order.departureTime}</span>
            <span className={styles.timeLine}>{order.arrivalTime}</span>
          </div>
        </div>
        <div className={styles.passengerCell}>{getPassengers(order)}</div>
        <div className={styles.seatCell}>
          <div>{getSeatTypeLabel(order)}</div>
          <div>{getSeatNoLabel(order)}</div>
        </div>
        <div className={styles.priceCell}>
          <div>{getTicketTypeLabel(order)}</div>
          <strong>{formatPrice(order.totalPrice)}</strong>
        </div>
      </div>
    </article>
  )
}

export default function TravelOrderSection() {
  const [orders, setOrders] = useState<TravelOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(withBasePath(`/api/travel-orders?sortDir=${sortDir}`))
      const json = await res.json()
      setOrders(json.data ?? [])
      setLastSynced(json.lastSynced ?? null)
    } finally {
      setLoading(false)
    }
  }, [sortDir])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h2>出行订单</h2>
            <span className={styles.rule}>
              安装 Chrome 插件后，打开 12306 未出行订单页面即可自动同步；系统会在出行前 3 天、2 天、1 天的 00:00 发送出行提醒。
            </span>
          </div>
          {lastSynced && (
            <Typography.Text type="secondary" className={styles.lastSynced}>
              最近同步：{formatDateTimeShanghai(lastSynced)}
            </Typography.Text>
          )}
        </div>
        <div className={styles.sortRow}>
          <SortPillControls
            ariaLabel="出行订单排序"
            options={[
              {
                key: 'departureTime',
                label: '出发时间',
                active: true,
                direction: sortDir,
                onClick: () => setSortDir((current) => (current === 'asc' ? 'desc' : 'asc')),
              },
            ]}
          />
        </div>
      </div>

      <Spin spinning={loading}>
        {!loading && orders.length === 0 ? (
          <Empty
            description={
              <span>
                暂无出行订单数据
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  请在 Chrome 中安装插件，打开 12306 未出行订单页面即可自动同步
                </Typography.Text>
              </span>
            }
          />
        ) : (
          <div className={styles.orderTable}>
            <div className={styles.tableHead}>
              <span>车次信息</span>
              <span>旅客信息</span>
              <span>席位信息</span>
              <span>票价</span>
            </div>
            <div className={styles.orderList}>
              {orders.map((order) => (
                <OrderCard key={order.orderNo} order={order} />
              ))}
            </div>
          </div>
        )}
      </Spin>
    </section>
  )
}
