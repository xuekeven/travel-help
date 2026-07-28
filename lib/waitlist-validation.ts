import { Prisma } from '@prisma/client'

export type NormalizedWaitlistOrder = {
  orderNo: string
  departureDate: Date
  fromStation: string
  toStation: string
  trainNumbers: string[]
  seatType: string
  ticketCount: number
  price: Prisma.Decimal
  departureTime: string
  arrivalTime: string
  status: string
  rawData: Prisma.InputJsonValue
}

export function normalizeWaitlistOrders(
  body: unknown
): { ok: true; orders: NormalizedWaitlistOrder[] } | { ok: false; error: string } {
  if (!isRecord(body) || !Array.isArray(body.orders) || body.orders.length > 500) {
    return { ok: false, error: 'orders 必须是最多 500 项的数组' }
  }

  const orders: NormalizedWaitlistOrder[] = []
  const orderNumbers = new Set<string>()

  for (const value of body.orders) {
    const order = normalizeWaitlistOrder(value)
    if (!order) return { ok: false, error: 'orders 数据格式不正确' }
    if (orderNumbers.has(order.orderNo)) {
      return { ok: false, error: `订单号重复：${order.orderNo}` }
    }
    orderNumbers.add(order.orderNo)
    orders.push(order)
  }

  return { ok: true, orders }
}

function normalizeWaitlistOrder(value: unknown): NormalizedWaitlistOrder | null {
  if (!isRecord(value)) return null

  const orderNo = requiredString(value.orderNo, 100)
  const departureDate = parseDateOnly(value.departureDate)
  const fromStation = requiredString(value.fromStation, 50)
  const toStation = requiredString(value.toStation, 100)
  const trainNumbers = stringArray(value.trainNumbers, 20, 30)
  const seatType = requiredString(value.seatType, 100)
  const status = requiredString(value.status, 100)
  const ticketCount = Number(value.ticketCount)
  const price = Number(value.price)
  const departureTime = parseTime(value.departureTime)
  const arrivalTime = parseTime(value.arrivalTime)

  if (
    !orderNo ||
    !departureDate ||
    !fromStation ||
    !toStation ||
    !trainNumbers ||
    trainNumbers.length === 0 ||
    !seatType ||
    !status ||
    !Number.isInteger(ticketCount) ||
    ticketCount < 1 ||
    ticketCount > 20 ||
    !Number.isFinite(price) ||
    price < 0 ||
    !departureTime ||
    !arrivalTime
  ) {
    return null
  }

  return {
    orderNo,
    departureDate,
    fromStation,
    toStation,
    trainNumbers,
    seatType,
    ticketCount,
    price: new Prisma.Decimal(price),
    departureTime,
    arrivalTime,
    status,
    rawData: isJsonValue(value.rawData) ? value.rawData : {},
  }
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null
}

function parseTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? `${match[1]}:${match[2]}` : null
}

function requiredString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text && text.length <= maxLength ? text : null
}

function stringArray(
  value: unknown,
  maxItems: number,
  maxItemLength: number
): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null
  const items = value.map((item) => requiredString(item, maxItemLength))
  return items.some((item) => item === null) ? null : (items as string[])
}

function isJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (value === null) return false
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  return isRecord(value) && Object.values(value).every((item) => item === null || isJsonValue(item))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
