import { describe, expect, it, vi } from 'vitest'
import { getTripStatus, parseTripInput } from '@/lib/trip'

describe('trip input validation', () => {
  it('normalizes a valid trip input', () => {
    const result = parseTripInput({
      name: ' 成都周末游 ',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      cities: ['成都', ' 重庆 ', '成都'],
      notes: ' 吃火锅 ',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('成都周末游')
      expect(result.data.cities).toEqual(['成都', '重庆', '成都'])
      expect(result.data.notes).toBe('吃火锅')
    }
  })

  it('rejects a reversed date range', () => {
    const result = parseTripInput({
      name: '错误行程',
      startDate: '2026-10-04',
      endDate: '2026-10-01',
      cities: ['成都'],
    })
    expect(result).toEqual({ ok: false, error: '结束日期不能早于出发日期' })
  })

  it('requires at least one city', () => {
    const result = parseTripInput({
      name: '无城市行程',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      cities: [],
    })
    expect(result).toEqual({ ok: false, error: '请至少填写一个城市' })
  })
})

describe('trip status', () => {
  it('marks trips using their date window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T12:00:00+08:00'))

    expect(getTripStatus(new Date('2026-09-19'), new Date('2026-09-22'))).toBe('ACTIVE')
    expect(getTripStatus(new Date('2026-09-25'), new Date('2026-09-27'))).toBe('UPCOMING')
    expect(getTripStatus(new Date('2026-11-01'), new Date('2026-11-03'))).toBe('PLANNING')
    expect(getTripStatus(new Date('2026-09-10'), new Date('2026-09-12'))).toBe('COMPLETED')

    vi.useRealTimers()
  })
})
