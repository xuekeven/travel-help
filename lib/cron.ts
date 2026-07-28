import { schedule } from 'node-cron'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import {
  formatDateForReminder,
  formatSaleDateTimeShanghai,
  formatWeekdayForReminder,
  getTodayCN,
} from '@/lib/date'
import { sendWeComMessage } from '@/lib/notify'
import { buildTravelOrderReminder, isActiveTravelOrder } from '@/lib/travel-order'
import type {
  PlanReminderTask,
  PlanReminderType,
  TravelPlan,
  WaitlistOrder,
} from '@prisma/client'

function buildPlanMessage(
  plan: TravelPlan,
  task: Pick<PlanReminderTask, 'saleDate' | 'saleDateIndex' | 'reminderType'>
): string {
  const dateStr = formatDateForReminder(plan.departureDate)
  const weekday = formatWeekdayForReminder(plan.departureDate)
  const saleDateLabel =
    task.saleDateIndex === 0 ? '开售时间' : `开售时间${task.saleDateIndex + 1}`
  const saleDateText = formatSaleDateTimeShanghai(task.saleDate)
  const timing = getReminderTimingLabel(task.reminderType)
  return `【${dateStr}】【${weekday}】【${plan.fromStation}】到【${plan.toStation}】的火车票，【${saleDateLabel}：${saleDateText}】，这是${timing}提醒，请关注`
}

function getReminderTimingLabel(
  reminderType: PlanReminderType
): '发售前 1 天' | '发售前 15 分钟' {
  return reminderType === 'ONE_DAY_BEFORE' ? '发售前 1 天' : '发售前 15 分钟'
}

function buildWaitlistMessage(order: WaitlistOrder, daysUntilDeparture: 0 | 1 | 2): string {
  const dateStr = formatDateForReminder(order.departureDate)
  const weekday = formatWeekdayForReminder(order.departureDate)
  const timing = daysUntilDeparture === 0 ? '今天就要出行了' : `还有${daysUntilDeparture}天就要出行了`
  return `【${dateStr}】【${weekday}】【${order.fromStation}】到【${order.toStation}】的候补订单还没有候补成功，${timing}，请考虑【买长乘短、买短乘长、更换交通方式】等方案`
}

function isPendingWaitlistOrder(order: WaitlistOrder): boolean {
  return !/(已兑现|兑现成功|成功|已取消|取消|退单|已退|已关闭|关闭)/.test(order.status)
}

type ProcessReminderResult = 'empty' | 'sent' | 'failed'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function processNextDuePlanReminder(now: Date): Promise<ProcessReminderResult> {
  return prisma.$transaction(
    async (tx) => {
      const dueTasks = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "plan_reminder_tasks"
        WHERE "status" = 'PENDING'::"ReminderStatus"
          AND "reminderAt" <= ${now}
        ORDER BY "reminderAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `
      const dueTask = dueTasks[0]
      if (!dueTask) return 'empty'

      const task = await tx.planReminderTask.findUnique({
        where: { id: dueTask.id },
        include: { plan: true },
      })
      if (!task) return 'empty'

      try {
        const delivered = await sendWeComMessage(buildPlanMessage(task.plan, task))
        if (!delivered) {
          await tx.planReminderTask.update({
            where: { id: task.id },
            data: {
              attempts: { increment: 1 },
              lastError: '未配置企业微信中转，提醒尚未发送',
            },
          })
          return 'failed'
        }
      } catch (error) {
        await tx.planReminderTask.update({
          where: { id: task.id },
          data: {
            attempts: { increment: 1 },
            lastError: getErrorMessage(error),
          },
        })
        console.error(`[Cron] 购票提醒发送失败，任务 ${task.id} 将在下分钟重试：`, error)
        return 'failed'
      }

      await tx.planReminderTask.update({
        where: { id: task.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      })
      return 'sent'
    },
    {
      maxWait: 5_000,
      timeout: 60_000,
    }
  )
}

async function runSaleReminder(now = new Date()) {
  const batchSize = 100
  let sentCount = 0

  try {
    while (sentCount < batchSize) {
      const result = await processNextDuePlanReminder(now)
      if (result === 'empty' || result === 'failed') break
      sentCount += 1
    }

    if (sentCount > 0) {
      console.log(`[Cron] 购票提醒完成：发送 ${sentCount} 条`)
    }
  } catch (err) {
    console.error('[Cron] 购票提醒执行异常：', err)
  }
}

async function runDailyReminder() {
  console.log(`[Cron] 每日订单提醒任务开始，时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)

  try {
    const today = getTodayCN()
    const waitlistTargets = [0, 1, 2] as const
    const travelOrderTargets = [0, 1, 2] as const

    const [waitlistOrdersByDays, travelOrdersByDays] = await Promise.all([
      Promise.all(waitlistTargets.map((days) =>
        prisma.waitlistOrder.findMany({
          where: {
            departureDate: addDays(new Date(today), days),
          },
        })
      )),
      Promise.all(travelOrderTargets.map((days) =>
        prisma.travelOrder.findMany({
          where: {
            departureDate: addDays(new Date(today), days),
          },
        })
      )),
    ])
    for (const [index, orders] of waitlistOrdersByDays.entries()) {
      const days = waitlistTargets[index]
      for (const order of orders.filter(isPendingWaitlistOrder)) {
        await sendWeComMessage(buildWaitlistMessage(order, days))
      }
    }

    for (const [index, orders] of travelOrdersByDays.entries()) {
      const days = travelOrderTargets[index]
      for (const order of orders.filter(isActiveTravelOrder)) {
        await sendWeComMessage(buildTravelOrderReminder(order, days))
      }
    }

    const pendingWaitlistCount = waitlistOrdersByDays.reduce(
      (sum, orders) => sum + orders.filter(isPendingWaitlistOrder).length,
      0
    )
    const activeTravelOrderCount = travelOrdersByDays.reduce(
      (sum, orders) => sum + orders.filter(isActiveTravelOrder).length,
      0
    )

    console.log(
      `[Cron] 每日订单提醒完成：候补临近出行 ${pendingWaitlistCount} 条，出行订单提醒 ${activeTravelOrderCount} 条`
    )
  } catch (err) {
    console.error('[Cron] 每日订单提醒执行异常：', err)
  }
}

export function startCronJobs() {
  schedule('* * * * *', () => runSaleReminder(), { timezone: 'Asia/Shanghai' })
  schedule('0 0 * * *', runDailyReminder, { timezone: 'Asia/Shanghai' })
  console.log('[Cron] 定时任务已注册：购票提醒每分钟检查，订单提醒每日 00:00 (Asia/Shanghai)')
}

// 供手动调试：直接执行一次任务逻辑
export { processNextDuePlanReminder, runDailyReminder, runSaleReminder }
