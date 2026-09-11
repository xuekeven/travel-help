import { addDays, subDays, subHours, subMinutes } from 'date-fns'
import type { Prisma, ReminderKind } from '@prisma/client'
import {
  createDateTimeShanghai,
  formatDateForReminder,
  formatSaleDateTimeShanghai,
  formatWeekdayForReminder,
} from '@/lib/date'
import { buildTravelOrderReminder, isActiveTravelOrder } from '@/lib/travel-order'

type DaysUntilDeparture = 0 | 1 | 2

export type ReminderSeed = {
  dedupeKey: string
  kind: ReminderKind
  sourceId: string
  scheduledAt: Date
  expiresAt: Date
  payload: Prisma.InputJsonValue
}

type PlanForReminder = {
  id: string
  departureDate: Date
  saleDate: Date
  additionalSaleDates: Date[]
  fromStation: string
  toStation: string
}

export type WaitlistOrderForReminder = {
  orderNo: string
  departureDate: Date
  fromStation: string
  toStation: string
  status: string
}

export type TravelOrderForReminder = {
  orderNo: string
  departureDate: Date
  departureTime: string
  fromStation: string
  toStation: string
  trainCode: string
  passengerNames: string[]
  seatTypeNames: string[]
  seatNames: string[]
  cancelFlag: string | null
  ticketStatusNames: string[]
  orderStatus: string | null
}

const DAILY_REMINDER_DAYS = [2, 1, 0] as const
const ORDER_REMINDER_INITIAL_BACKFILL_GRACE_MS = 30 * 60 * 1000

export function buildPlanReminderSeeds(plan: PlanForReminder): ReminderSeed[] {
  const seeds = [plan.saleDate, ...plan.additionalSaleDates].flatMap(
    (saleDate, saleDateIndex) => {
      const basePayload = {
        departureDate: formatDateForReminder(plan.departureDate),
        fromStation: plan.fromStation,
        toStation: plan.toStation,
        saleDate: saleDate.toISOString(),
        saleDateIndex,
      }

      return [
        {
          dedupeKey: `plan:${plan.id}:${saleDate.getTime()}:ONE_DAY_BEFORE`,
          kind: 'PLAN_SALE' as const,
          sourceId: plan.id,
          scheduledAt: subHours(saleDate, 24),
          expiresAt: saleDate,
          payload: {
            ...basePayload,
            reminderType: 'ONE_DAY_BEFORE',
          },
        },
        {
          dedupeKey: `plan:${plan.id}:${saleDate.getTime()}:FIFTEEN_MINUTES_BEFORE`,
          kind: 'PLAN_SALE' as const,
          sourceId: plan.id,
          scheduledAt: subMinutes(saleDate, 15),
          expiresAt: saleDate,
          payload: {
            ...basePayload,
            reminderType: 'FIFTEEN_MINUTES_BEFORE',
          },
        },
      ]
    }
  )

  return [...new Map(seeds.map((seed) => [seed.dedupeKey, seed])).values()]
}

export function buildTravelOrderReminderSeeds(
  orders: TravelOrderForReminder[]
): ReminderSeed[] {
  return orders.filter(isActiveTravelOrder).flatMap((order) =>
    DAILY_REMINDER_DAYS.map((daysUntilDeparture) => {
      const scheduledAt = getDailyReminderTime(order.departureDate, daysUntilDeparture)
      return {
        dedupeKey: `travel:${order.orderNo}:${scheduledAt.getTime()}:${daysUntilDeparture}`,
        kind: 'TRAVEL_ORDER' as const,
        sourceId: order.orderNo,
        scheduledAt,
        expiresAt: addDays(scheduledAt, 1),
        payload: {
          departureDate: formatDateForReminder(order.departureDate),
          departureTime: order.departureTime,
          fromStation: order.fromStation,
          toStation: order.toStation,
          trainCode: order.trainCode,
          passengerNames: order.passengerNames,
          seatTypeNames: order.seatTypeNames,
          seatNames: order.seatNames,
          daysUntilDeparture,
        },
      }
    })
  )
}

export function buildWaitlistReminderSeeds(
  orders: WaitlistOrderForReminder[]
): ReminderSeed[] {
  return orders.filter(isPendingWaitlistOrder).flatMap((order) =>
    DAILY_REMINDER_DAYS.map((daysUntilDeparture) => {
      const scheduledAt = getDailyReminderTime(order.departureDate, daysUntilDeparture)
      return {
        dedupeKey: `waitlist:${order.orderNo}:${scheduledAt.getTime()}:${daysUntilDeparture}`,
        kind: 'WAITLIST_ORDER' as const,
        sourceId: order.orderNo,
        scheduledAt,
        expiresAt: addDays(scheduledAt, 1),
        payload: {
          orderNo: order.orderNo,
          departureDate: formatDateForReminder(order.departureDate),
          fromStation: order.fromStation,
          toStation: order.toStation,
          daysUntilDeparture,
        },
      }
    })
  )
}

export async function syncPlanReminderTasks(
  tx: Prisma.TransactionClient,
  plan: PlanForReminder,
  now = new Date()
): Promise<void> {
  await syncReminderSeeds(tx, 'PLAN_SALE', { sourceId: plan.id }, buildPlanReminderSeeds(plan), now)
}

export async function syncTravelOrderReminderTasks(
  tx: Prisma.TransactionClient,
  orders: TravelOrderForReminder[],
  now = new Date()
): Promise<void> {
  await syncReminderSeeds(
    tx,
    'TRAVEL_ORDER',
    {},
    buildTravelOrderReminderSeeds(orders),
    now,
    ORDER_REMINDER_INITIAL_BACKFILL_GRACE_MS
  )
}

export async function syncWaitlistReminderTasks(
  tx: Prisma.TransactionClient,
  orders: WaitlistOrderForReminder[],
  now = new Date()
): Promise<void> {
  await syncReminderSeeds(
    tx,
    'WAITLIST_ORDER',
    {},
    buildWaitlistReminderSeeds(orders),
    now,
    ORDER_REMINDER_INITIAL_BACKFILL_GRACE_MS
  )
}

export async function cancelPlanReminderTasks(
  tx: Prisma.TransactionClient,
  planId: string
): Promise<void> {
  await tx.reminderTask.updateMany({
    where: {
      kind: 'PLAN_SALE',
      sourceId: planId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    data: {
      status: 'CANCELLED',
      lockedAt: null,
      lockOwner: null,
    },
  })
}

async function syncReminderSeeds(
  tx: Prisma.TransactionClient,
  kind: ReminderKind,
  scope: { sourceId?: string },
  seeds: ReminderSeed[],
  now: Date,
  initialBackfillGraceMs?: number
): Promise<void> {
  const activeSeeds = seeds.filter((seed) => seed.expiresAt.getTime() > now.getTime())
  const desiredKeys = activeSeeds.map((seed) => seed.dedupeKey)
  const creatableSeeds = activeSeeds.filter(
    (seed) =>
      initialBackfillGraceMs === undefined ||
      seed.scheduledAt.getTime() >= now.getTime() - initialBackfillGraceMs
  )
  const creatableKeys = new Set(creatableSeeds.map((seed) => seed.dedupeKey))

  await tx.reminderTask.updateMany({
    where: {
      kind,
      ...scope,
      status: 'PENDING',
      ...(desiredKeys.length > 0 && {
        dedupeKey: { notIn: desiredKeys },
      }),
    },
    data: { status: 'CANCELLED' },
  })

  if (activeSeeds.length === 0) return

  if (creatableSeeds.length > 0) {
    await tx.reminderTask.createMany({
      data: creatableSeeds.map((seed) => ({
        ...seed,
        nextRetryAt: seed.scheduledAt,
      })),
      skipDuplicates: true,
    })
  }

  await Promise.all(
    activeSeeds.map(async (seed) => {
      await tx.reminderTask.updateMany({
        where: {
          dedupeKey: seed.dedupeKey,
          status: 'PENDING',
        },
        data: {
          scheduledAt: seed.scheduledAt,
          expiresAt: seed.expiresAt,
          payload: seed.payload,
        },
      })
      if (creatableKeys.has(seed.dedupeKey)) {
        await tx.reminderTask.updateMany({
          where: {
            dedupeKey: seed.dedupeKey,
            status: 'CANCELLED',
          },
          data: {
            status: 'PENDING',
            scheduledAt: seed.scheduledAt,
            expiresAt: seed.expiresAt,
            payload: seed.payload,
            nextRetryAt: seed.scheduledAt,
            lockedAt: null,
            lockOwner: null,
            attempts: 0,
            sentAt: null,
            lastError: null,
          },
        })
      }
    })
  )
}

export function buildReminderMessage(
  kind: ReminderKind,
  payload: Prisma.JsonValue
): string {
  const data = getPayloadRecord(payload)

  if (kind === 'PLAN_SALE') {
    const departureDate = getString(data.departureDate)
    const saleDate = getString(data.saleDate)
    const saleDateIndex = getNonNegativeInteger(data.saleDateIndex)
    const reminderType = getString(data.reminderType)
    const saleDateLabel =
      saleDateIndex === 0 ? '开售时间' : `开售时间${saleDateIndex + 1}`
    const timing =
      reminderType === 'ONE_DAY_BEFORE' ? '售前 24 小时' : '售前 15 分钟'

    return `【${departureDate}】【${formatWeekdayForReminder(departureDate)}】【${getString(data.fromStation)}】到【${getString(data.toStation)}】的火车票，【${saleDateLabel}：${formatSaleDateTimeShanghai(saleDate)}】，这是${timing}提醒，请关注`
  }

  const daysUntilDeparture = getDaysUntilDeparture(data.daysUntilDeparture)

  if (kind === 'TRAVEL_ORDER') {
    return buildTravelOrderReminder(
      {
        departureDate: new Date(getString(data.departureDate)),
        departureTime: getString(data.departureTime),
        fromStation: getString(data.fromStation),
        toStation: getString(data.toStation),
        trainCode: getString(data.trainCode),
        passengerNames: getStringArray(data.passengerNames),
        seatTypeNames: getStringArray(data.seatTypeNames),
        seatNames: getStringArray(data.seatNames),
      },
      daysUntilDeparture
    )
  }

  const departureDate = getString(data.departureDate)
  const orderNo = getOptionalString(data.orderNo)
  const orderNoLabel = orderNo ? `【订单号${orderNo}】` : ''
  const timing =
    daysUntilDeparture === 0
      ? '今天就要出行了'
      : `还有${daysUntilDeparture}天就要出行了`
  return `【${departureDate}】【${formatWeekdayForReminder(departureDate)}】【${getString(data.fromStation)}】到【${getString(data.toStation)}】的候补订单${orderNoLabel}还没有候补成功，${timing}，请考虑【买长乘短、买短乘长、更换交通方式】等方案`
}

export function isPendingWaitlistOrder(order: { status: string }): boolean {
  return !/(已兑现|兑现成功|成功|已取消|取消|退单|已退|已关闭|关闭)/.test(order.status)
}

function getDailyReminderTime(departureDate: Date, daysUntilDeparture: number): Date {
  const departureDateText = formatDateForReminder(departureDate)
  const midnight = createDateTimeShanghai(departureDateText, '00:00')
  if (!midnight) throw new Error(`无效出行日期：${departureDateText}`)
  return subDays(midnight, daysUntilDeparture)
}

function getPayloadRecord(payload: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('提醒任务 payload 不是对象')
  }
  return payload as Record<string, Prisma.JsonValue>
}

function getString(value: Prisma.JsonValue | undefined): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('提醒任务 payload 缺少字符串字段')
  }
  return value
}

function getOptionalString(value: Prisma.JsonValue | undefined): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function getStringArray(value: Prisma.JsonValue | undefined): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('提醒任务 payload 数组字段无效')
  }
  return value as string[]
}

function getNonNegativeInteger(value: Prisma.JsonValue | undefined): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('提醒任务 payload 数字字段无效')
  }
  return value
}

function getDaysUntilDeparture(
  value: Prisma.JsonValue | undefined
): DaysUntilDeparture {
  const days = getNonNegativeInteger(value)
  if (days !== 0 && days !== 1 && days !== 2) {
    throw new Error('提醒任务的出行天数无效')
  }
  return days
}
