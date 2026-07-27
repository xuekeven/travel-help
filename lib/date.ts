import { format, addDays, differenceInCalendarDays } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
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
  const d = dateOnlyToLocalDate(departureDate)
  return format(addDays(d, -14), 'yyyy-MM-dd')
}

/** 根据出行日期计算默认开售时间（提前 14 天的 08:00，中国时区） */
export function getDefaultSaleTime(departureDate: Date | string): Date {
  return createDateTimeShanghai(getSaleDate(departureDate), '08:00')!
}

/**
 * 距开售还有多少个自然日（负数表示已过开售日，0 表示开售日期是今天）
 */
export function getDaysUntilSale(departureDate: Date | string): number {
  return getDaysUntilSaleDate(getSaleDate(departureDate))
}

export function getDaysUntilSaleDate(saleDate: Date | string): number {
  const today = getTodayCN()
  const saleDateCN = format(toZonedTime(new Date(saleDate), TIMEZONE), 'yyyy-MM-dd')
  return differenceInCalendarDays(dateOnlyToLocalDate(saleDateCN), dateOnlyToLocalDate(today))
}

export function getAutoPlanStatus(departureDate: Date | string): 'PENDING_SALE' | 'ON_SALE' {
  return getAutoPlanStatusForSaleDate(getDefaultSaleTime(departureDate))
}

export function getAutoPlanStatusForSaleDate(saleDate: Date | string): 'PENDING_SALE' | 'ON_SALE' {
  return new Date(saleDate).getTime() > Date.now() ? 'PENDING_SALE' : 'ON_SALE'
}

/**
 * 将出行日期格式化为通知文本格式：'2026年5月1日 周五'
 */
export function formatDateForNotify(departureDate: Date | string): string {
  const d = dateOnlyToLocalDate(departureDate)
  return format(d, 'yyyy年M月d日 EEEE', { locale: zhCN })
}

/** 通知文本使用：2026-06-01 */
export function formatDateForReminder(departureDate: Date | string): string {
  return format(dateOnlyToLocalDate(departureDate), 'yyyy-MM-dd')
}

/** 通知文本使用：周一 */
export function formatWeekdayForReminder(departureDate: Date | string): string {
  const d = dateOnlyToLocalDate(departureDate)
  return format(d, 'EEE', { locale: zhCN })
}

/** 表格展示：2026-06-04 周四 */
export function formatDepartureDateWithWeekday(departureDate: Date | string): string {
  const date = dateOnlyToLocalDate(departureDate)
  return format(date, 'yyyy-MM-dd EEE', { locale: zhCN })
}

function dateOnlyToLocalDate(date: Date | string): Date {
  const dateStr =
    typeof date === 'string'
      ? date.slice(0, 10)
      : formatDateOnlyUtc(date)
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateOnlyUtc(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 最近同步等：2026-05-19 周一 01:26:40（中国时区） */
export function formatDateTimeShanghai(iso: string | Date): string {
  const zoned = toZonedTime(new Date(iso), TIMEZONE)
  return format(zoned, 'yyyy-MM-dd EEE HH:mm:ss', { locale: zhCN })
}

export function formatSaleDateTimeShanghai(iso: string | Date): string {
  const zoned = toZonedTime(new Date(iso), TIMEZONE)
  return format(zoned, 'yyyy-MM-dd EEE HH:mm', { locale: zhCN })
}

export function createDateTimeShanghai(date: string, time: string): Date | null {
  const dateText = date.slice(0, 10)
  const [year, month, day] = dateText.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null
  return fromZonedTime(new Date(year, month - 1, day, hour, minute, 0), TIMEZONE)
}
