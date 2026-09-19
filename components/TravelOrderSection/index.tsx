'use client'
import { useCallback, useEffect, useState } from 'react'
import { Empty, Spin, Typography, message } from 'antd'
import type { TravelOrder } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import { toZonedTime } from 'date-fns-tz'
import { createDateTimeShanghai, formatDateTimeShanghai, TIMEZONE } from '@/lib/date'
import SortPillControls from '@/components/SortPillControls'
import SectionTitle from '@/components/SectionTitle'
import styles from './index.module.scss'

function joinUnique(values: string[]) {
  return [...new Set(values.filter(Boolean))].join('、')
}

function formatPrice(price: number) {
  return `¥${Number(price).toFixed(1)}`
}

function formatRefundFee(price: number, rate: number) {
  if (rate === 0) return '0元'
  const rawFee = Math.max(price * rate, 2)
  const roundedFee = Math.round(rawFee * 2) / 2
  return `${Number.isInteger(roundedFee) ? roundedFee.toFixed(0) : roundedFee.toFixed(1)}元`
}

function parseDepartureDateTime(order: TravelOrder) {
  return createDateTimeShanghai(order.departureDate, order.departureTime)
}

function formatOrderDate(iso: string) {
  const zoned = toZonedTime(new Date(iso), TIMEZONE)
  const year = zoned.getFullYear()
  const month = String(zoned.getMonth() + 1).padStart(2, '0')
  const day = String(zoned.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatRefundDeadline(date: Date) {
  const zoned = toZonedTime(date, TIMEZONE)
  return `${zoned.getMonth() + 1}月${zoned.getDate()}号${zoned.getHours()}点${String(zoned.getMinutes()).padStart(2, '0')}分`
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function addDaysToDateText(dateText: string, days: number) {
  const [year, month, day] = dateText.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getRefundFeeRows(order: TravelOrder) {
  const departureAt = parseDepartureDateTime(order)
  if (!departureAt) return []
  const now = Date.now()
  const freeUntil = createDateTimeShanghai(addDaysToDateText(order.departureDate, -7), '00:00')

  return [
    {
      // 12306 的“开车前 8 天以上”按自然日判断：6月19日车票在6月11日当天仍免费。
      deadline: freeUntil,
      fee: formatRefundFee(order.totalPrice, 0),
    },
    {
      deadline: addHours(departureAt, -48),
      fee: formatRefundFee(order.totalPrice, 0.05),
    },
    {
      deadline: addHours(departureAt, -24),
      fee: formatRefundFee(order.totalPrice, 0.1),
    },
    {
      deadline: departureAt,
      fee: formatRefundFee(order.totalPrice, 0.2),
    },
  ].filter((row): row is { deadline: Date; fee: string } => {
    if (!row.deadline) return false
    return row.deadline.getTime() > now
  })
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
  const refundFeeRows = getRefundFeeRows(order)

  return (
    <article className={styles.orderCard}>
      <div className={styles.orderMeta}>
        <span>出行日期：{order.displayDate}</span>
        <span>订票日期：{formatOrderDate(order.orderDate)}</span>
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
        <div className={styles.refundFeeCell}>
          {refundFeeRows.length > 0 ? (
            refundFeeRows.map((row) => (
              <div key={row.deadline.toISOString()}>
                {formatRefundDeadline(row.deadline)}前退票费{row.fee}
              </div>
            ))
          ) : (
            '-'
          )}
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!Array.isArray(json.data)) throw new Error('响应数据格式不正确')
      setOrders(json.data ?? [])
      setLastSynced(json.lastSynced ?? null)
    } catch (error) {
      console.error('[出行订单] 加载失败：', error)
      message.error('出行订单加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [sortDir])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <section className={styles.section} id="orders">
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <SectionTitle
            title="出行订单"
            titleHref="https://kyfw.12306.cn/otn/view/train_order.html"
            tips={[
              '安装 Chrome 插件后，打开 12306 未出行订单页面，即可自动同步订单',
              '所有未出行订单都会在出行日期前 2 天的 00:00、前 1 天的 00:00 和出行当天的 00:00 发送提醒',
            ]}
          />
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
          {lastSynced && (
            <Typography.Text type="secondary" className={styles.lastSynced}>
              最近同步：{formatDateTimeShanghai(lastSynced)}
            </Typography.Text>
          )}
        </div>
      </div>

      <Spin spinning={loading}>
        {!loading && orders.length === 0 ? (
          <Empty
            description={
              <span>
                暂无出行订单数据
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
              <span>退票费</span>
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
