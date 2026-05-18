import type { Prisma } from '@prisma/client'
import type { WaitlistNeedSegment } from '@/types'

type RawNeed = {
  board_train_code?: string
  from_station_name?: string
  to_station_name?: string
  start_time?: string
  arrive_time?: string
  seat_name?: string
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
      seatType: n.seat_name ?? '',
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
