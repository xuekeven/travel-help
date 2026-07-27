import type { Prisma } from '@prisma/client'
import type { WaitlistNeedSegment } from '@/types'

type RawNeed = {
  board_train_code?: string
  from_station_name?: string
  to_station_name?: string
  start_time?: string
  arrive_time?: string
  seat_name?: string
  seat_type?: string
}

const SEAT_TYPE_CODE_LABELS: Record<string, string> = {
  '1': '硬座',
  '2': '软座',
  '3': '硬卧',
  '4': '软卧',
  '6': '高级软卧',
  '9': '商务座',
  A: '高级动卧',
  F: '动卧',
  I: '一等卧',
  J: '二等卧',
  M: '一等座',
  O: '二等座',
  P: '特等座',
  W: '无座',
}

function getSeatTypeLabel(need: RawNeed): string {
  const seatName = need.seat_name?.trim()
  if (seatName) return seatName

  return [...new Set((need.seat_type ?? '').split(''))]
    .map((code) => SEAT_TYPE_CODE_LABELS[code] ?? code)
    .filter(Boolean)
    .join('、')
}

/** 从 12306 原始 JSON 的 needs[] 解析每一档候补（多车次、多终到站） */
export function needSegmentsFromRawData(rawData: Prisma.JsonValue): WaitlistNeedSegment[] {
  if (rawData == null || typeof rawData !== 'object' || Array.isArray(rawData)) return []
  const needs = (rawData as { needs?: RawNeed[] }).needs
  if (!Array.isArray(needs) || needs.length === 0) return []

  return needs
    .map((n, i) => ({
      index: i + 1,
      trainCode: n.board_train_code ?? '',
      fromStation: n.from_station_name ?? '',
      toStation: n.to_station_name ?? '',
      departureTime: n.start_time ?? '',
      arrivalTime: n.arrive_time ?? '',
      seatType: getSeatTypeLabel(n),
    }))
    .filter((s) => s.trainCode)
}

/** 无 needs 的旧数据：用车次列表 + 订单汇总字段合成一行 */
export function fallbackNeedSegments(order: {
  trainNumbers: string[]
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  seatType: string
}): WaitlistNeedSegment[] {
  if (order.trainNumbers.length === 0) return []
  return order.trainNumbers.map((trainCode, i) => ({
    index: i + 1,
    trainCode,
    fromStation: order.fromStation,
    toStation: order.toStation,
    departureTime: order.departureTime,
    arrivalTime: order.arrivalTime,
    seatType: order.seatType,
  }))
}

export function buildNeedSegmentsForOrder(order: {
  rawData: Prisma.JsonValue
  trainNumbers: string[]
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  seatType: string
}): WaitlistNeedSegment[] {
  const fromRaw = needSegmentsFromRawData(order.rawData)
  if (fromRaw.length > 0) return fromRaw
  return fallbackNeedSegments(order)
}
