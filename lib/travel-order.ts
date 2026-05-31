import { Prisma } from '@prisma/client'
import { formatDepartureDateWithWeekday, formatWeekdayForReminder } from '@/lib/date'

type RawOrder = Record<string, any>
type RawTicket = Record<string, any>

export type TravelOrderTicketSnapshot = {
  passengerName: string
  trainCode: string
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  seatTypeName: string
  coachName: string
  seatName: string
  ticketTypeName: string
  ticketStatusName: string
}

export type NormalizedTravelOrder = {
  orderNo: string
  orderDate: Date
  departureDate: Date
  departureTime: string
  arrivalDate: Date | null
  arrivalTime: string
  fromStation: string
  toStation: string
  trainCode: string
  trainNo: string | null
  distance: number | null
  passengerNames: string[]
  seatTypeNames: string[]
  coachNames: string[]
  seatNames: string[]
  ticketTypeNames: string[]
  ticketStatusNames: string[]
  ticketCount: number
  totalPrice: Prisma.Decimal
  ticketSnapshots: TravelOrderTicketSnapshot[]
  cancelFlag: string | null
  resignFlag: string | null
  returnFlag: string | null
  payFlag: string | null
  confirmFlag: string | null
  orderStatus: string | null
  rawData: Prisma.JsonValue
}

export type TravelOrderView = Omit<NormalizedTravelOrder, 'departureDate' | 'orderDate' | 'arrivalDate' | 'totalPrice'> & {
  id: string
  departureDate: string
  orderDate: string
  arrivalDate: string | null
  totalPrice: number
  syncedAt: string
  createdAt: string
  displayDate: string
}

export function normalizeTravelOrder(order: RawOrder): NormalizedTravelOrder | null {
  const orderNo = String(order?.sequence_no ?? '').trim()
  if (!orderNo) return null

  const tickets: RawTicket[] = Array.isArray(order?.tickets) ? order.tickets : []
  const firstTicket = tickets[0] ?? {}
  const stationTrain = firstTicket.stationTrainDTO ?? {}
  const fromStations = uniqueStrings([
    ...(Array.isArray(order?.from_station_name_page) ? order.from_station_name_page : []),
    stationTrain.from_station_name,
    firstTicket.from_station_name,
  ])
  const toStations = uniqueStrings([
    ...(Array.isArray(order?.to_station_name_page) ? order.to_station_name_page : []),
    stationTrain.to_station_name,
    firstTicket.to_station_name,
  ])
  const passengerNames = uniqueStrings([
    ...(Array.isArray(order?.array_passser_name_page) ? order.array_passser_name_page : []),
    ...tickets.map((ticket) => ticket?.passengerDTO?.passenger_name),
  ])
  const seatTypeNames = uniqueStrings(tickets.map((ticket) => ticket?.seat_type_name))
  const coachNames = uniqueStrings(tickets.map((ticket) => ticket?.coach_name))
  const seatNames = uniqueStrings(tickets.map((ticket) => ticket?.seat_name))
  const ticketTypeNames = uniqueStrings(tickets.map((ticket) => ticket?.ticket_type_name))
  const ticketStatusNames = uniqueStrings(tickets.map((ticket) => ticket?.ticket_status_name))

  const departureDate = parseDateOnly(
    order?.start_train_date_page ??
      firstTicket?.train_date_local ??
      firstTicket?.train_date ??
      stationTrain?.trainDTO?.start_date_str
  )
  if (!departureDate) return null

  const arrivalDate = parseDateOnly(firstTicket?.stationTrainDTO?.arrive_date_local ?? firstTicket?.arrive_date_local)
  const departureTime = normalizeTime(order?.start_time_page ?? firstTicket?.stationTrainDTO?.start_time_local ?? firstTicket?.start_time ?? '')
  const arrivalTime = normalizeTime(order?.arrive_time_page ?? firstTicket?.stationTrainDTO?.arrive_time_local ?? firstTicket?.arrive_time ?? '')
  const trainCode =
    String(order?.train_code_page ?? stationTrain?.station_train_code ?? stationTrain?.trainDTO?.train_code ?? '').trim()
  const trainNo = String(stationTrain?.trainDTO?.train_no ?? '').trim() || null
  const distance = toNumberOrNull(stationTrain?.distance)
  const totalPrice = new Prisma.Decimal(order?.ticket_total_price_page ?? order?.ticket_price_all ?? 0)

  const snapshots: TravelOrderTicketSnapshot[] = tickets.map((ticket) => ({
    passengerName: String(ticket?.passengerDTO?.passenger_name ?? '').trim(),
    trainCode: String(ticket?.stationTrainDTO?.station_train_code ?? trainCode).trim(),
    fromStation: String(ticket?.stationTrainDTO?.from_station_name ?? fromStations[0] ?? '').trim(),
    toStation: String(ticket?.stationTrainDTO?.to_station_name ?? toStations[0] ?? '').trim(),
    departureTime: normalizeTime(
      ticket?.stationTrainDTO?.start_time_local ??
        ticket?.stationTrainDTO?.start_time ??
        order?.start_time_page ??
        ''
    ),
    arrivalTime: normalizeTime(
      ticket?.stationTrainDTO?.arrive_time_local ??
        ticket?.stationTrainDTO?.arrive_time ??
        order?.arrive_time_page ??
        ''
    ),
    seatTypeName: String(ticket?.seat_type_name ?? '').trim(),
    coachName: String(ticket?.coach_name ?? '').trim(),
    seatName: String(ticket?.seat_name ?? '').trim(),
    ticketTypeName: String(ticket?.ticket_type_name ?? '').trim(),
    ticketStatusName: String(ticket?.ticket_status_name ?? '').trim(),
  }))

  return {
    orderNo,
    orderDate: parseDateTime(order?.order_date) ?? new Date(),
    departureDate,
    departureTime,
    arrivalDate,
    arrivalTime,
    fromStation: fromStations[0] ?? '',
    toStation: toStations[0] ?? '',
    trainCode,
    trainNo,
    distance,
    passengerNames,
    seatTypeNames,
    coachNames,
    seatNames,
    ticketTypeNames,
    ticketStatusNames,
    ticketCount: toNumberOrNull(order?.ticket_totalnum) ?? Math.max(passengerNames.length, tickets.length, 1),
    totalPrice,
    ticketSnapshots: snapshots,
    cancelFlag: stringOrNull(order?.cancel_flag),
    resignFlag: stringOrNull(order?.resign_flag),
    returnFlag: stringOrNull(order?.return_flag),
    payFlag: stringOrNull(order?.pay_flag),
    confirmFlag: stringOrNull(order?.confirm_flag),
    orderStatus: deriveOrderStatus(order, ticketStatusNames),
    rawData: order,
  }
}

export function serializeTravelOrder(record: {
  id: string
  orderNo: string
  orderDate: Date
  departureDate: Date
  departureTime: string
  arrivalDate: Date | null
  arrivalTime: string
  fromStation: string
  toStation: string
  trainCode: string
  trainNo: string | null
  distance: number | null
  passengerNames: string[]
  seatTypeNames: string[]
  coachNames: string[]
  seatNames: string[]
  ticketTypeNames: string[]
  ticketStatusNames: string[]
  ticketCount: number
  totalPrice: Prisma.Decimal
  ticketSnapshots: Prisma.JsonValue
  cancelFlag: string | null
  resignFlag: string | null
  returnFlag: string | null
  payFlag: string | null
  confirmFlag: string | null
  orderStatus: string | null
  rawData: Prisma.JsonValue
  syncedAt: Date
  createdAt: Date
}): TravelOrderView {
  return {
    ...record,
    departureDate: formatDateOnly(record.departureDate),
    orderDate: record.orderDate.toISOString(),
    arrivalDate: record.arrivalDate ? formatDateOnly(record.arrivalDate) : null,
    totalPrice: Number(record.totalPrice),
    ticketSnapshots: (Array.isArray(record.ticketSnapshots) ? record.ticketSnapshots : []) as TravelOrderTicketSnapshot[],
    syncedAt: record.syncedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    displayDate: formatDepartureDateWithWeekday(record.departureDate),
  }
}

export function formatTravelOrderDisplayDate(order: { departureDate: Date; departureTime: string; arrivalTime: string }): string {
  return `${formatDepartureDateWithWeekday(order.departureDate)} ${order.departureTime || '--:--'} - ${order.arrivalTime || '--:--'}`
}

export function buildTravelOrderReminder(order: {
  departureDate: Date
  departureTime: string
  fromStation: string
  toStation: string
  trainCode: string
  passengerNames: string[]
  seatTypeNames: string[]
  seatNames: string[]
}, daysUntilDeparture: 1 | 2 | 3): string {
  const dateStr = formatDateOnly(order.departureDate)
  const weekday = formatWeekdayForReminder(order.departureDate)
  const passengers = order.passengerNames.length > 0 ? order.passengerNames.join('、') : '未知乘车人'
  const seatType = dedupeJoin(order.seatTypeNames) || '未知座位类型'
  const seatNo = dedupeJoin(order.seatNames) || '未知座位号'
  return `【${dateStr}】【${weekday}】【${order.departureTime || '--:--'}】【${order.fromStation}】到【${order.toStation}】的【${order.trainCode || '未知车次'}】次列车还有${daysUntilDeparture}天就要出行了，乘车人：【${passengers}】，座位：【${seatType} ${seatNo}】，请提前安排出行`
}

export function isActiveTravelOrder(order: {
  cancelFlag: string | null
  ticketStatusNames: string[]
  orderStatus: string | null
}): boolean {
  if (order.cancelFlag === 'Y') return false
  const text = [order.orderStatus, ...order.ticketStatusNames].filter(Boolean).join('|')
  return !/(已取消|取消|已退票|退票|已改签失败|改签失败|已关闭|关闭|退单)/.test(text)
}

function deriveOrderStatus(order: RawOrder, ticketStatusNames: string[]): string | null {
  const preferred = [
    order?.ticket_status_name_page,
    order?.status_name,
    ...ticketStatusNames,
  ].find((item) => typeof item === 'string' && String(item).trim())
  return preferred ? String(preferred).trim() : null
}

function parseDateOnly(value: unknown): Date | null {
  if (!value) return null
  const text = String(value).trim()
  if (!text) return null
  if (/^\d{8}$/.test(text)) {
    const year = Number(text.slice(0, 4))
    const month = Number(text.slice(4, 6))
    const day = Number(text.slice(6, 8))
    return new Date(year, month - 1, day)
  }
  const datePart = text.slice(0, 10)
  const [year, month, day] = datePart.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function parseDateTime(value: unknown): Date | null {
  if (!value) return null
  const text = String(value).trim()
  if (!text) return null
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeTime(value: unknown): string {
  if (!value) return ''
  const text = String(value).trim()
  const match = text.match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : text
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]
}

function dedupeJoin(values: string[]): string {
  return uniqueStrings(values).join('、')
}

function stringOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
