import type { PlaceCategory, PlaceVisitStatus, TripPlace } from '@prisma/client'

const CATEGORIES = new Set<PlaceCategory>(['FOOD', 'ATTRACTION', 'HOTEL', 'TRANSPORT', 'SHOPPING', 'OTHER'])
const VISIT_STATUSES = new Set<PlaceVisitStatus>(['WISHLIST', 'PLANNED', 'VISITED'])
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export interface TripPlaceInput {
  name: string
  category: PlaceCategory
  visitStatus: PlaceVisitStatus
  city: string | null
  address: string | null
  latitude: number
  longitude: number
  plannedDate: Date | null
  plannedTime: string | null
  notes: string | null
  guideUrl: string | null
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

export function parseTripPlaceInput(
  body: unknown,
  tripRange: { startDate: Date; endDate: Date }
): { ok: true; data: TripPlaceInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: '请求内容格式不正确' }
  }

  const value = body as Record<string, unknown>
  const name = optionalText(value.name, 80)
  const category = value.category as PlaceCategory
  const visitStatus = value.visitStatus as PlaceVisitStatus
  const latitude = Number(value.latitude)
  const longitude = Number(value.longitude)
  const plannedDateText = typeof value.plannedDate === 'string' ? value.plannedDate : ''
  const plannedTime = optionalText(value.plannedTime, 5)
  const guideUrl = optionalText(value.guideUrl, 500)

  if (!name) return { ok: false, error: '请输入地点名称' }
  if (!CATEGORIES.has(category)) return { ok: false, error: '地点分类不正确' }
  if (!VISIT_STATUSES.has(visitStatus)) return { ok: false, error: '地点状态不正确' }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, error: '纬度必须在 -90 到 90 之间' }
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: '经度必须在 -180 到 180 之间' }
  }
  if (plannedTime && !TIME_PATTERN.test(plannedTime)) {
    return { ok: false, error: '计划时间格式应为 HH:mm' }
  }
  if (guideUrl) {
    try {
      const url = new URL(guideUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      return { ok: false, error: '攻略链接格式不正确' }
    }
  }

  let plannedDate: Date | null = null
  if (plannedDateText) {
    if (!DATE_PATTERN.test(plannedDateText)) return { ok: false, error: '计划日期格式不正确' }
    plannedDate = new Date(`${plannedDateText}T00:00:00.000Z`)
    if (plannedDate < tripRange.startDate || plannedDate > tripRange.endDate) {
      return { ok: false, error: '计划日期应在本次行程范围内' }
    }
  }

  return {
    ok: true,
    data: {
      name,
      category,
      visitStatus,
      city: optionalText(value.city, 60),
      address: optionalText(value.address, 200),
      latitude,
      longitude,
      plannedDate,
      plannedTime,
      notes: optionalText(value.notes, 1000),
      guideUrl,
    },
  }
}

export function serializeTripPlace(place: TripPlace) {
  return {
    id: place.id,
    tripId: place.tripId,
    name: place.name,
    category: place.category,
    visitStatus: place.visitStatus,
    city: place.city,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    plannedDate: place.plannedDate?.toISOString().slice(0, 10) ?? null,
    plannedTime: place.plannedTime,
    notes: place.notes,
    guideUrl: place.guideUrl,
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  }
}
