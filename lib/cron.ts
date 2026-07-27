import { schedule } from 'node-cron'
import { addDays, startOfMinute, subDays, subMinutes } from 'date-fns'
import { prisma } from '@/lib/prisma'
import {
  formatDateForReminder,
  formatSaleDateTimeShanghai,
  formatWeekdayForReminder,
  getTodayCN,
} from '@/lib/date'
import { sendWeComMessage } from '@/lib/notify'
import { buildTravelOrderReminder, isActiveTravelOrder } from '@/lib/travel-order'
import type { TravelPlan, WaitlistOrder } from '@prisma/client'

function buildPlanMessage(
  plan: TravelPlan,
  saleDate: Date,
  saleDateIndex: number,
  timing: '发售前 1 天' | '发售前 15 分钟'
): string {
  const dateStr = formatDateForReminder(plan.departureDate)
  const weekday = formatWeekdayForReminder(plan.departureDate)
  const saleDateLabel = saleDateIndex === 0 ? '开售时间' : `开售时间${saleDateIndex + 1}`
  const saleDateText = formatSaleDateTimeShanghai(saleDate)
  return `【${dateStr}】【${weekday}】【${plan.fromStation}】到【${plan.toStation}】的火车票，【${saleDateLabel}：${saleDateText}】，这是${timing}提醒，请关注`
}

function getSaleReminderTiming(
  saleDate: Date,
  now: Date
): '发售前 1 天' | '发售前 15 分钟' | null {
  const currentMinute = startOfMinute(now).getTime()
  if (startOfMinute(subDays(saleDate, 1)).getTime() === currentMinute) {
    return '发售前 1 天'
  }
  if (startOfMinute(subMinutes(saleDate, 15)).getTime() === currentMinute) {
    return '发售前 15 分钟'
  }
  return null
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

async function runSaleReminder(now = new Date()) {
  try {
    const plans = await prisma.travelPlan.findMany()
    const reminders = plans.flatMap((plan) =>
      [plan.saleDate, ...plan.additionalSaleDates].flatMap((saleDate, saleDateIndex) => {
        const timing = getSaleReminderTiming(saleDate, now)
        return timing ? [{ plan, saleDate, saleDateIndex, timing }] : []
      })
    )

    for (const reminder of reminders) {
      await sendWeComMessage(
        buildPlanMessage(
          reminder.plan,
          reminder.saleDate,
          reminder.saleDateIndex,
          reminder.timing
        )
      )
    }

    if (reminders.length > 0) {
      console.log(`[Cron] 购票提醒完成：发送 ${reminders.length} 条`)
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
export { getSaleReminderTiming, runDailyReminder, runSaleReminder }
