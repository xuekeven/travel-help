import { schedule } from 'node-cron'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getTodayCN, formatDateForReminder, formatWeekdayForReminder } from '@/lib/date'
import { sendWeComMessage } from '@/lib/notify'
import type { TravelPlan } from '@prisma/client'

function buildMessage(
  plan: TravelPlan,
  timing: '今天' | '明天'
): string {
  const dateStr = formatDateForReminder(plan.departureDate)
  const weekday = formatWeekdayForReminder(plan.departureDate)
  return `【${dateStr}】【${weekday}】【${plan.fromStation}】到【${plan.toStation}】的火车票，${timing}就要开售了，请关注`
}

async function runDailyReminder() {
  console.log(`[Cron] 开售提醒任务开始，时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)

  try {
    const today = getTodayCN()

    // 今天开售：出行日期 = 今天 + 14 天
    const todaySaleTarget = addDays(new Date(today), 14)
    // 明天开售：出行日期 = 今天 + 15 天
    const tomorrowSaleTarget = addDays(new Date(today), 15)

    const [todayPlans, tomorrowPlans] = await Promise.all([
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
    ])

    for (const plan of todayPlans) {
      await sendWeComMessage(buildMessage(plan, '今天'))
    }
    for (const plan of tomorrowPlans) {
      await sendWeComMessage(buildMessage(plan, '明天'))
    }

    console.log(`[Cron] 完成：今天开售 ${todayPlans.length} 条，明天开售 ${tomorrowPlans.length} 条`)
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
