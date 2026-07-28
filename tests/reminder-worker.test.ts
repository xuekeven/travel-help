import { describe, expect, it, vi } from 'vitest'
import type { ReminderKind } from '@prisma/client'
import {
  getRetryDelayMs,
  processReminderBatch,
  type ClaimedReminder,
  type ReminderWorkerDependencies,
} from '@/lib/reminder-worker'

function reminder(id: string, attempts = 1): ClaimedReminder {
  return {
    id,
    dedupeKey: `plan:${id}`,
    kind: 'PLAN_SALE' as ReminderKind,
    attempts,
    lockOwner: 'worker',
    payload: {
      departureDate: '2026-08-20',
      fromStation: '北京西',
      toStation: '上海虹桥',
      saleDate: '2026-08-06T00:00:00.000Z',
      saleDateIndex: 0,
      reminderType: 'ONE_DAY_BEFORE',
    },
  }
}

function dependencies(
  claimNext: ReminderWorkerDependencies['claimNext'],
  send: ReminderWorkerDependencies['send']
): ReminderWorkerDependencies {
  return {
    claimNext,
    send,
    markSent: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  }
}

describe('processReminderBatch', () => {
  it('continues with the next task when the first send fails', async () => {
    const queue = [reminder('first'), reminder('second')]
    const claimNext = vi.fn(async () => queue.shift() ?? null)
    const send = vi
      .fn<ReminderWorkerDependencies['send']>()
      .mockRejectedValueOnce(new Error('relay unavailable'))
      .mockResolvedValueOnce(true)
    const deps = dependencies(claimNext, send)

    const result = await processReminderBatch(
      deps,
      new Date('2026-08-05T00:00:00.000Z'),
      10,
      'worker'
    )

    expect(result).toEqual({ processed: 2, sent: 1, failed: 1 })
    expect(send).toHaveBeenCalledTimes(2)
    expect(deps.markFailed).toHaveBeenCalledTimes(1)
    expect(deps.markSent).toHaveBeenCalledTimes(1)
  })

  it('continues when writing the failed status also fails', async () => {
    const queue = [reminder('first'), reminder('second')]
    const deps = dependencies(
      vi.fn(async () => queue.shift() ?? null),
      vi
        .fn<ReminderWorkerDependencies['send']>()
        .mockRejectedValueOnce(new Error('relay unavailable'))
        .mockResolvedValueOnce(true)
    )
    vi.mocked(deps.markFailed).mockRejectedValueOnce(new Error('database unavailable'))

    const result = await processReminderBatch(deps, new Date(), 10, 'worker')

    expect(result).toEqual({ processed: 2, sent: 1, failed: 1 })
    expect(deps.markSent).toHaveBeenCalledTimes(1)
  })

  it('allows only one concurrent worker to claim the same task', async () => {
    let state: 'PENDING' | 'PROCESSING' | 'SENT' = 'PENDING'
    const task = reminder('only')
    const send = vi.fn().mockResolvedValue(true)
    const shared: ReminderWorkerDependencies = {
      async claimNext(_now, workerId) {
        if (state !== 'PENDING') return null
        state = 'PROCESSING'
        return { ...task, lockOwner: workerId }
      },
      send,
      async markSent() {
        state = 'SENT'
      },
      async markFailed() {
        state = 'PENDING'
      },
    }

    const [first, second] = await Promise.all([
      processReminderBatch(shared, new Date(), 1, 'worker-a'),
      processReminderBatch(shared, new Date(), 1, 'worker-b'),
    ])

    expect(first.sent + second.sent).toBe(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(state).toBe('SENT')
  })

  it('processes an overdue task after a worker restart', async () => {
    let claimed = false
    const deps = dependencies(
      vi.fn(async (now) => {
        if (claimed || now < new Date('2026-08-01T00:00:00.000Z')) return null
        claimed = true
        return reminder('overdue')
      }),
      vi.fn().mockResolvedValue(true)
    )

    const result = await processReminderBatch(
      deps,
      new Date('2026-08-01T12:00:00.000Z'),
      10,
      'restarted-worker'
    )

    expect(result.sent).toBe(1)
  })
})

describe('getRetryDelayMs', () => {
  it('uses bounded exponential-style backoff', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(getRetryDelayMs)).toEqual(
      [1, 2, 5, 10, 30, 60, 60].map((minutes) => minutes * 60_000)
    )
  })
})
