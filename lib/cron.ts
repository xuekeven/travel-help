import { schedule } from 'node-cron'
import { isMockDataMode } from '@/lib/mock-data'
import { runReminderQueue } from '@/lib/reminder-worker'

async function runReminders(now = new Date()) {
  try {
    const result = await runReminderQueue(now)
    if (result.processed > 0) {
      console.log(
        `[Cron] 提醒任务完成：处理 ${result.processed} 条，发送 ${result.sent} 条，失败 ${result.failed} 条`
      )
    }
  } catch (error) {
    console.error('[Cron] 提醒任务执行异常：', error)
  }
}

export function startCronJobs() {
  if (isMockDataMode()) {
    console.log('[Cron] 模拟数据模式不启动提醒任务')
    return
  }

  schedule('* * * * *', () => runReminders(), { timezone: 'Asia/Shanghai' })
  console.log('[Cron] 定时任务已注册：持久化提醒队列每分钟检查 (Asia/Shanghai)')
}

export { runReminders }
