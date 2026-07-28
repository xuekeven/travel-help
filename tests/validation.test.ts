import { describe, expect, it } from 'vitest'
import {
  parsePlanCreateInput,
  parsePlanUpdateInput,
} from '@/lib/plan-validation'
import { normalizeWaitlistOrders } from '@/lib/waitlist-validation'

describe('plan validation', () => {
  it('accepts a valid plan', () => {
    const result = parsePlanCreateInput({
      departureDate: '2026-08-20',
      saleDate: '2026-08-06T00:00:00.000Z',
      additionalSaleDates: ['2026-08-07T01:00:00+08:00'],
      fromStation: '北京西',
      toStation: '上海虹桥',
      seatType: 'SECOND_CLASS',
      ticketCount: 2,
    })

    expect(result.ok).toBe(true)
  })

  it('rejects invalid dates, seat types, ticket counts, and loose timestamps', () => {
    expect(parsePlanUpdateInput({ departureDate: '2026-02-31' }).ok).toBe(false)
    expect(parsePlanUpdateInput({ seatType: 'STANDING' }).ok).toBe(false)
    expect(parsePlanUpdateInput({ ticketCount: 0 }).ok).toBe(false)
    expect(parsePlanUpdateInput({ saleDate: 'tomorrow' }).ok).toBe(false)
    expect(
      parsePlanUpdateInput({ saleDate: '2026-02-31T00:00:00.000Z' }).ok
    ).toBe(false)
  })
})

describe('waitlist validation', () => {
  const validOrder = {
    orderNo: 'E123',
    departureDate: '2026-08-20',
    fromStation: '北京西',
    toStation: '上海虹桥',
    trainNumbers: ['G1'],
    seatType: '二等座',
    ticketCount: 1,
    price: 553,
    departureTime: '08:00',
    arrivalTime: '12:30',
    status: '待兑现',
    rawData: {},
  }

  it('accepts a valid waitlist order', () => {
    expect(normalizeWaitlistOrders({ orders: [validOrder] }).ok).toBe(true)
  })

  it('rejects invalid payloads before database replacement', () => {
    expect(
      normalizeWaitlistOrders({
        orders: [{ ...validOrder, departureDate: '2026-02-31' }],
      }).ok
    ).toBe(false)
    expect(
      normalizeWaitlistOrders({
        orders: [{ ...validOrder, trainNumbers: [] }],
      }).ok
    ).toBe(false)
    expect(
      normalizeWaitlistOrders({
        orders: [validOrder, validOrder],
      }).ok
    ).toBe(false)
  })
})
