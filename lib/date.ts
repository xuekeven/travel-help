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

/**
 * 将出行日期格式化为通知文本格式：'2026年5月1日 周五'
 */
export function formatDateForNotify(departureDate: Date | string): string {
  const d = new Date(departureDate)
  return format(d, 'yyyy年M月d日 EEEE', { locale: zhCN })
}
