import type { Trip, TripStatus } from '@prisma/client'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface TripInput {
  name: string
  startDate: Date
  endDate: Date
  cities: string[]
  notes: string | null
}

export function parseTripInput(body: unknown):
  | { ok: true; data: TripInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: '请求内容格式不正确' }
  }

  const value = body as Record<string, unknown>
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const startDateText = typeof value.startDate === 'string' ? value.startDate : ''
  const endDateText = typeof value.endDate === 'string' ? value.endDate : ''
  const cities = Array.isArray(value.cities)
    ? value.cities.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
  const notes = typeof value.notes === 'string' && value.notes.trim() ? value.notes.trim() : null

  if (!name) return { ok: false, error: '请输入行程名称' }
  if (!DATE_PATTERN.test(startDateText) || !DATE_PATTERN.test(endDateText)) {
    return { ok: false, error: '请选择有效的出发和结束日期' }
  }

  const startDate = new Date(`${startDateText}T00:00:00.000Z`)
  const endDate = new Date(`${endDateText}T00:00:00.000Z`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: '日期格式不正确' }
  }
  if (endDate < startDate) return { ok: false, error: '结束日期不能早于出发日期' }
  if (cities.length === 0) return { ok: false, error: '请至少填写一个城市' }

  return { ok: true, data: { name, startDate, endDate, cities, notes } }
}

export function getTripStatus(startDate: Date, endDate: Date): TripStatus {
  const todayText = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const today = new Date(`${todayText}T00:00:00.000Z`)

  if (today > endDate) return 'COMPLETED'
  if (today >= startDate) return 'ACTIVE'

  const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / 86_400_000)
  return daysUntilStart <= 30 ? 'UPCOMING' : 'PLANNING'
}

type TripWithCount = Trip & {
  _count?: {
    travelPlans: number
    travelOrders: number
    waitlistOrders: number
  }
}

export function serializeTrip(trip: TripWithCount) {
  const status = getTripStatus(trip.startDate, trip.endDate)
  return {
    id: trip.id,
    name: trip.name,
    startDate: trip.startDate.toISOString().slice(0, 10),
    endDate: trip.endDate.toISOString().slice(0, 10),
    cities: trip.cities,
    status,
    notes: trip.notes,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    transportCount:
      (trip._count?.travelPlans ?? 0) +
      (trip._count?.travelOrders ?? 0) +
      (trip._count?.waitlistOrders ?? 0),
    planCount: trip._count?.travelPlans ?? 0,
    orderCount: trip._count?.travelOrders ?? 0,
    waitlistCount: trip._count?.waitlistOrders ?? 0,
  }
}
