import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import {
  buildPlanReminderSeeds,
  buildReminderMessage,
  buildWaitlistReminderSeeds,
  syncPlanReminderTasks,
  syncTravelOrderReminderTasks,
} from '@/lib/reminder-task'

const plan = {
  id: 'plan-1',
  departureDate: new Date('2026-08-20T00:00:00.000Z'),
  saleDate: new Date('2026-08-06T00:00:00.000Z'),
  additionalSaleDates: [new Date('2026-08-07T01:00:00.000Z')],
  fromStation: '北京西',
  toStation: '上海虹桥',
}

describe('plan reminder seeds', () => {
  it('creates stable 24-hour and 15-minute reminder keys for every sale time', () => {
    const seeds = buildPlanReminderSeeds(plan)

    expect(seeds).toHaveLength(4)
    expect(seeds.map((seed) => seed.dedupeKey)).toEqual([
      'plan:plan-1:1785974400000:ONE_DAY_BEFORE',
      'plan:plan-1:1785974400000:FIFTEEN_MINUTES_BEFORE',
      'plan:plan-1:1786064400000:ONE_DAY_BEFORE',
      'plan:plan-1:1786064400000:FIFTEEN_MINUTES_BEFORE',
    ])
    expect(seeds[0].scheduledAt.toISOString()).toBe('2026-08-05T00:00:00.000Z')
    expect(seeds[1].scheduledAt.toISOString()).toBe('2026-08-05T23:45:00.000Z')
  })

  it('does not update or cancel SENT records when a plan is synchronized', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 })
    const createMany = vi.fn().mockResolvedValue({ count: 4 })
    const tx = {
      reminderTask: { updateMany, createMany },
    } as unknown as Prisma.TransactionClient

    await syncPlanReminderTasks(
      tx,
      plan,
      new Date('2026-08-01T00:00:00.000Z')
    )

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    )
    for (const [argument] of updateMany.mock.calls) {
      expect(argument.where.status).not.toBe('SENT')
    }
  })
})

describe('waitlist reminder seeds', () => {
  it('keeps separate reminders for orders with the same itinerary', () => {
    const seeds = buildWaitlistReminderSeeds([
      {
        orderNo: 'E123123123123',
        departureDate: new Date('2026-07-31T00:00:00.000Z'),
        fromStation: '北京西',
        toStation: '邯郸东',
        status: '待兑现',
      },
      {
        orderNo: 'E456456456456',
        departureDate: new Date('2026-07-31T00:00:00.000Z'),
        fromStation: '北京西',
        toStation: '邯郸东',
        status: '待兑现',
      },
    ])

    expect(seeds).toHaveLength(6)
    expect(seeds[0]).toEqual(
      expect.objectContaining({
        dedupeKey: 'waitlist:E123123123123:1785254400000:2',
        sourceId: 'E123123123123',
        payload: expect.objectContaining({ orderNo: 'E123123123123' }),
      })
    )
    expect(
      buildReminderMessage(
        seeds[0].kind,
        seeds[0].payload as Prisma.JsonValue
      )
    ).toBe(
      '【2026-07-31】【周五】【北京西】到【邯郸东】的候补订单【订单号E123123123123】还没有候补成功，还有2天就要出行了，请考虑【买长乘短、买短乘长、更换交通方式】等方案'
    )
  })

  it('keeps legacy single-order payloads readable', () => {
    expect(
      buildReminderMessage('WAITLIST_ORDER', {
        departureDate: '2026-07-31',
        fromStation: '北京西',
        toStation: '邯郸东',
        daysUntilDeparture: 2,
      })
    ).toContain('的候补订单还没有候补成功')
  })
})

describe('order reminder initial backfill', () => {
  const order = {
    orderNo: 'E123123123123',
    departureDate: new Date('2026-09-05T00:00:00.000Z'),
    departureTime: '15:03',
    fromStation: '邯郸东',
    toStation: '石家庄',
    trainCode: 'G1282',
    passengerNames: ['薛凯'],
    seatTypeNames: ['二等座'],
    seatNames: ['12C号'],
    cancelFlag: null,
    ticketStatusNames: ['已支付'],
    orderStatus: null,
  }

  it('does not first-create an order reminder more than 30 minutes late', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 })
    const createMany = vi.fn().mockResolvedValue({ count: 2 })
    const tx = {
      reminderTask: { updateMany, createMany },
    } as unknown as Prisma.TransactionClient

    await syncTravelOrderReminderTasks(
      tx,
      [order],
      new Date('2026-09-03T15:56:00.000Z')
    )

    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany.mock.calls[0][0].data).toHaveLength(2)
    expect(createMany.mock.calls[0][0].data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dedupeKey: 'travel:E123123123123:1788364800000:2',
        }),
      ])
    )
    expect(updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dedupeKey: 'travel:E123123123123:1788364800000:2',
          status: 'CANCELLED',
        }),
      })
    )
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dedupeKey: 'travel:E123123123123:1788364800000:2',
          status: 'PENDING',
        }),
        data: expect.not.objectContaining({ attempts: expect.anything() }),
      })
    )
  })

  it('allows first creation within the 30-minute grace window', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 })
    const createMany = vi.fn().mockResolvedValue({ count: 3 })
    const tx = {
      reminderTask: { updateMany, createMany },
    } as unknown as Prisma.TransactionClient

    await syncTravelOrderReminderTasks(
      tx,
      [order],
      new Date('2026-09-02T16:20:00.000Z')
    )

    expect(createMany.mock.calls[0][0].data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dedupeKey: 'travel:E123123123123:1788364800000:2',
        }),
      ])
    )
  })
})
