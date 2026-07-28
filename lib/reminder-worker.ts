import { randomUUID } from 'node:crypto'
import { subMinutes } from 'date-fns'
import type { Prisma, ReminderKind } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendWeComMessage } from '@/lib/notify'
import { buildReminderMessage } from '@/lib/reminder-task'

const DEFAULT_BATCH_SIZE = 100
const LEASE_MINUTES = 2
const RETRY_MINUTES = [1, 2, 5, 10, 30, 60] as const

export type ClaimedReminder = {
  id: string
  dedupeKey: string
  kind: ReminderKind
  payload: Prisma.JsonValue
  attempts: number
  lockOwner: string
}

export type ReminderWorkerDependencies = {
  claimNext: (now: Date, workerId: string) => Promise<ClaimedReminder | null>
  send: (content: string, idempotencyKey: string) => Promise<boolean>
  markSent: (task: ClaimedReminder, now: Date) => Promise<void>
  markFailed: (
    task: ClaimedReminder,
    error: string,
    nextRetryAt: Date
  ) => Promise<void>
}

export type ReminderBatchResult = {
  processed: number
  sent: number
  failed: number
}

export async function processReminderBatch(
  dependencies: ReminderWorkerDependencies,
  now = new Date(),
  batchSize = DEFAULT_BATCH_SIZE,
  workerId: string = randomUUID()
): Promise<ReminderBatchResult> {
  const result: ReminderBatchResult = { processed: 0, sent: 0, failed: 0 }

  while (result.processed < batchSize) {
    const task = await dependencies.claimNext(now, workerId)
    if (!task) break

    result.processed += 1
    try {
      const content = buildReminderMessage(task.kind, task.payload)
      const delivered = await dependencies.send(content, task.dedupeKey)
      if (!delivered) throw new Error('未配置企业微信中转，提醒尚未发送')

      await dependencies.markSent(task, new Date())
      result.sent += 1
    } catch (error) {
      const message = getErrorMessage(error)
      const nextRetryAt = new Date(now.getTime() + getRetryDelayMs(task.attempts))
      result.failed += 1
      try {
        await dependencies.markFailed(task, message, nextRetryAt)
      } catch (markError) {
        console.error(
          `[Cron] 提醒任务失败状态回写异常：任务=${task.id}，原因=${getErrorMessage(markError)}`
        )
      }
      console.error(
        `[Cron] 提醒任务处理失败：任务=${task.id}，下次重试=${nextRetryAt.toISOString()}，原因=${message}`
      )
    }
  }

  return result
}

export function getRetryDelayMs(attempts: number): number {
  const index = Math.min(Math.max(attempts - 1, 0), RETRY_MINUTES.length - 1)
  return RETRY_MINUTES[index] * 60_000
}

export async function prepareReminderQueue(now = new Date()): Promise<void> {
  const staleBefore = subMinutes(now, LEASE_MINUTES)

  await prisma.reminderTask.updateMany({
    where: {
      status: 'PROCESSING',
      OR: [{ lockedAt: null }, { lockedAt: { lte: staleBefore } }],
    },
    data: {
      status: 'PENDING',
      nextRetryAt: now,
      lockedAt: null,
      lockOwner: null,
      lastError: '处理租约超时，任务已回收',
    },
  })

  await prisma.reminderTask.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    data: {
      status: 'CANCELLED',
      lastError: '提醒已超过有效期',
    },
  })
}

export async function runReminderQueue(now = new Date()): Promise<ReminderBatchResult> {
  await prepareReminderQueue(now)
  return processReminderBatch(createPrismaWorkerDependencies(), now)
}

export function createPrismaWorkerDependencies(): ReminderWorkerDependencies {
  return {
    async claimNext(now, workerId) {
      const candidates = await prisma.reminderTask.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now },
          nextRetryAt: { lte: now },
          expiresAt: { gt: now },
        },
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      })

      for (const candidate of candidates) {
        const claimed = await prisma.reminderTask.updateMany({
          where: {
            id: candidate.id,
            status: 'PENDING',
            scheduledAt: { lte: now },
            nextRetryAt: { lte: now },
            expiresAt: { gt: now },
          },
          data: {
            status: 'PROCESSING',
            lockedAt: now,
            lockOwner: workerId,
            attempts: { increment: 1 },
          },
        })

        if (claimed.count === 1) {
          return {
            id: candidate.id,
            dedupeKey: candidate.dedupeKey,
            kind: candidate.kind,
            payload: candidate.payload,
            attempts: candidate.attempts + 1,
            lockOwner: workerId,
          }
        }
      }

      return null
    },

    send(content, idempotencyKey) {
      return sendWeComMessage(content, { idempotencyKey })
    },

    async markSent(task, now) {
      const updated = await prisma.reminderTask.updateMany({
        where: {
          id: task.id,
          status: 'PROCESSING',
          lockOwner: task.lockOwner,
        },
        data: {
          status: 'SENT',
          sentAt: now,
          lockedAt: null,
          lockOwner: null,
          lastError: null,
        },
      })
      if (updated.count !== 1) {
        throw new Error(`提醒任务 ${task.id} 的处理租约已失效`)
      }
    },

    async markFailed(task, error, nextRetryAt) {
      await prisma.reminderTask.updateMany({
        where: {
          id: task.id,
          status: 'PROCESSING',
          lockOwner: task.lockOwner,
        },
        data: {
          status: 'PENDING',
          nextRetryAt,
          lockedAt: null,
          lockOwner: null,
          lastError: error.slice(0, 1000),
        },
      })
    },
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
