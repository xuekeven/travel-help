import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import {
  buildPlanReminderSeeds,
  syncPlanReminderTasks,
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
