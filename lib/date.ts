import { format, addDays, differenceInCalendarDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { zhCN } from 'date-fns/locale'

export const TIMEZONE = 'Asia/Shanghai'

/**
 * 获取当前中国时区的日期字符串，格式 'yyyy-MM-dd'
 */
export function getTodayCN(): string {
  const zonedNow = toZonedTime(new Date(), TIMEZONE)
  return format(zonedNow, 'yyyy-MM-dd')
}

/**
 * 根据出行日期计算开售日（出行日期 - 14 天）
 * Prisma @db.Date 字段取出后是 UTC 00:00 的 Date 对象，直接 addDays 不会产生时区误差
 */
export function getSaleDate(departureDate: Date | string): string {
  const d = new Date(departureDate)
  return format(addDays(d, -14), 'yyyy-MM-dd')
}

/**
 * 距开售还有多少天（负数表示已过开售日，0 表示今天开售）
 */
export function getDaysUntilSale(departureDate: Date | string): number {
  const saleDate = getSaleDate(departureDate)
  const today = getTodayCN()
  return differenceInCalendarDays(new Date(saleDate), new Date(today))
}

export function getAutoPlanStatus(departureDate: Date | string): 'PENDING_SALE' | 'ON_SALE' {
  return getDaysUntilSale(departureDate) > 0 ? 'PENDING_SALE' : 'ON_SALE'
}

/**
 * 将出行日期格式化为通知文本格式：'2026年5月1日 周五'
 */
export function formatDateForNotify(departureDate: Date | string): string {
  const d = new Date(departureDate)
  return format(d, 'yyyy年M月d日 EEEE', { locale: zhCN })
}

/** 通知文本使用：2026-06-01 */
export function formatDateForReminder(departureDate: Date | string): string {
  const d = new Date(departureDate)
  return format(d, 'yyyy-MM-dd')
}

/** 通知文本使用：周一 */
export function formatWeekdayForReminder(departureDate: Date | string): string {
  const d = new Date(departureDate)
  return format(d, 'EEE', { locale: zhCN })
}

/** 表格展示：2026-06-04 周四 */
export function formatDepartureDateWithWeekday(departureDate: Date | string): string {
  const dateStr =
    typeof departureDate === 'string'
      ? departureDate.slice(0, 10)
      : format(departureDate, 'yyyy-MM-dd')
  const [y, m, d] = dateStr.split('-').map(Number)
  const local = new Date(y, m - 1, d)
  return format(local, 'yyyy-MM-dd EEE', { locale: zhCN })
}

/** 最近同步等：2026-05-19 周一 01:26:40（中国时区） */
export function formatDateTimeShanghai(iso: string | Date): string {
  const zoned = toZonedTime(new Date(iso), TIMEZONE)
  return format(zoned, 'yyyy-MM-dd EEE HH:mm:ss', { locale: zhCN })
}
