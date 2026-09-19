import { describe, expect, it } from 'vitest'
import { parseTripPlaceInput } from '@/lib/trip-place'

const tripRange = {
  startDate: new Date('2026-10-01T00:00:00.000Z'),
  endDate: new Date('2026-10-05T00:00:00.000Z'),
}

const validPlace = {
  name: ' 宽窄巷子 ',
  category: 'ATTRACTION',
  visitStatus: 'PLANNED',
  city: '成都',
  address: '青羊区',
  latitude: 30.6634,
  longitude: 104.0503,
  plannedDate: '2026-10-02',
  plannedTime: '15:30',
  notes: ' 下午去 ',
  guideUrl: 'https://example.com/guide',
}

describe('trip place validation', () => {
  it('normalizes a valid place', () => {
    const result = parseTripPlaceInput(validPlace, tripRange)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('宽窄巷子')
      expect(result.data.plannedDate?.toISOString().slice(0, 10)).toBe('2026-10-02')
      expect(result.data.notes).toBe('下午去')
    }
  })

  it('rejects dates outside the trip', () => {
    const result = parseTripPlaceInput({ ...validPlace, plannedDate: '2026-10-08' }, tripRange)
    expect(result).toEqual({ ok: false, error: '计划日期应在本次行程范围内' })
  })

  it('rejects invalid coordinates', () => {
    const result = parseTripPlaceInput({ ...validPlace, latitude: 100 }, tripRange)
    expect(result).toEqual({ ok: false, error: '纬度必须在 -90 到 90 之间' })
  })

  it('rejects non-http guide links', () => {
    const result = parseTripPlaceInput({ ...validPlace, guideUrl: 'javascript:alert(1)' }, tripRange)
    expect(result).toEqual({ ok: false, error: '攻略链接格式不正确' })
  })
})
