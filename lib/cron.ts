import { schedule } from 'node-cron'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getTodayCN, formatDateForReminder, formatWeekdayForReminder } from '@/lib/date'
import { sendWeComMessage } from '@/lib/notify'
import type { TravelPlan, WaitlistOrder } from '@prisma/client'

function buildPlanMessage(
  plan: TravelPlan,
  timing: '今天' | '明天'
): string {
  const dateStr = formatDateForReminder(plan.departureDate)
  const weekday = formatWeekdayForReminder(plan.departureDate)
  return `【${dateStr}】【${weekday}】【${plan.fromStation}】到【${plan.toStation}】的火车票，${timing}就要开售了，请关注`
}

function buildWaitlistMessage(order: WaitlistOrder, daysUntilDeparture: 1 | 2 | 3): string {
  const dateStr = formatDateForReminder(order.departureDate)
  const weekday = formatWeekdayForReminder(order.departureDate)
  return `【${dateStr}】【${weekday}】【${order.fromStation}】到【${order.toStation}】的候补订单还没有候补成功，还有${daysUntilDeparture}天就要出行了，请考虑【买长乘短、买短乘长、更换交通方式】等方案`
}

function isPendingWaitlistOrder(order: WaitlistOrder): boolean {
  return !/(已兑现|兑现成功|成功|已取消|取消|退单|已退|已关闭|关闭)/.test(order.status)
}

async function runDailyReminder() {
  console.log(`[Cron] 开售提醒任务开始，时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)

  try {
    const today = getTodayCN()

    // 今天开售：出行日期 = 今天 + 14 天
    const todaySaleTarget = addDays(new Date(today), 14)
    // 明天开售：出行日期 = 今天 + 15 天
    const tomorrowSaleTarget = addDays(new Date(today), 15)
    const waitlistTargets = [1, 2, 3] as const

    const [todayPlans, tomorrowPlans, ...waitlistOrdersByDays] = await Promise.all([
      prisma.travelPlan.findMany({
        where: {
          departureDate: todaySaleTarget,
        },
      }),
      prisma.travelPlan.findMany({
        where: {
          departureDate: tomorrowSaleTarget,
        },
      }),
      ...waitlistTargets.map((days) =>
        prisma.waitlistOrder.findMany({
          where: {
            departureDate: addDays(new Date(today), days),
          },
        })
      ),
    ])

    for (const plan of todayPlans) {
      await sendWeComMessage(buildPlanMessage(plan, '今天'))
    }
    for (const plan of tomorrowPlans) {
      await sendWeComMessage(buildPlanMessage(plan, '明天'))
    }
    for (const [index, orders] of waitlistOrdersByDays.entries()) {
      const days = waitlistTargets[index]
      for (const order of orders.filter(isPendingWaitlistOrder)) {
        await sendWeComMessage(buildWaitlistMessage(order, days))
      }
    }

    const pendingWaitlistCount = waitlistOrdersByDays.reduce(
      (sum, orders) => sum + orders.filter(isPendingWaitlistOrder).length,
      0
    )

    console.log(
      `[Cron] 完成：今天开售 ${todayPlans.length} 条，明天开售 ${tomorrowPlans.length} 条，候补临近出行 ${pendingWaitlistCount} 条`
    )
  } catch (err) {
    console.error('[Cron] 执行异常：', err)
  }
}

export function startCronJobs() {
  // 每日 00:00 中国时区
  schedule('0 0 * * *', runDailyReminder, { timezone: 'Asia/Shanghai' })
  console.log('[Cron] 定时任务已注册：每日 00:00 (Asia/Shanghai)')
}

// 供手动调试：直接执行一次任务逻辑
export { runDailyReminder }
