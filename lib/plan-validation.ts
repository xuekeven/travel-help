import type { SeatType } from '@prisma/client'

const SEAT_TYPES = new Set<SeatType>([
  'SECOND_CLASS',
  'FIRST_CLASS',
  'BUSINESS',
  'HARD_SLEEPER',
  'SOFT_SLEEPER',
  'HARD_SEAT',
  'NO_SEAT',
])

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type PlanCreateInput = {
  departureDate: Date
  saleDate?: Date
  additionalSaleDates: Date[]
  holidayName: string | null
  fromStation: string
  toStation: string
  seatType: SeatType
  ticketCount: number
  remark: string | null
}

export type PlanUpdateInput = Partial<PlanCreateInput>

export function parsePlanCreateInput(body: unknown): ValidationResult<PlanCreateInput> {
  if (!isRecord(body)) return invalid('请求体必须是对象')

  const departureDate = parseDateOnly(body.departureDate)
  if (!departureDate) return invalid('出行日期格式不正确')

  const saleDateResult = parseOptionalDateTime(body.saleDate, '开售时间')
  if (!saleDateResult.ok) return saleDateResult

  const additionalResult = parseAdditionalSaleDates(body.additionalSaleDates)
  if (!additionalResult.ok) return additionalResult

  const fromStation = parseRequiredString(body.fromStation, '始发站', 50)
  if (!fromStation.ok) return fromStation
  const toStation = parseRequiredString(body.toStation, '终到站', 50)
  if (!toStation.ok) return toStation

  if (typeof body.seatType !== 'string' || !SEAT_TYPES.has(body.seatType as SeatType)) {
    return invalid('座位类型不正确')
  }

  const ticketCount = body.ticketCount ?? 1
  if (!Number.isInteger(ticketCount) || Number(ticketCount) < 1 || Number(ticketCount) > 5) {
    return invalid('购票张数必须是 1 到 5 的整数')
  }

  const holidayName = parseOptionalString(body.holidayName, '节假日信息', 100)
  if (!holidayName.ok) return holidayName
  const remark = parseOptionalString(body.remark, '备注', 500)
  if (!remark.ok) return remark

  return {
    ok: true,
    data: {
      departureDate,
      ...(saleDateResult.data && { saleDate: saleDateResult.data }),
      additionalSaleDates: additionalResult.data,
      holidayName: holidayName.data,
      fromStation: fromStation.data,
      toStation: toStation.data,
      seatType: body.seatType as SeatType,
      ticketCount: Number(ticketCount),
      remark: remark.data,
    },
  }
}

export function parsePlanUpdateInput(body: unknown): ValidationResult<PlanUpdateInput> {
  if (!isRecord(body)) return invalid('请求体必须是对象')
  const data: PlanUpdateInput = {}

  if ('departureDate' in body) {
    const value = parseDateOnly(body.departureDate)
    if (!value) return invalid('出行日期格式不正确')
    data.departureDate = value
  }

  if ('saleDate' in body) {
    const value = parseDateTime(body.saleDate)
    if (!value) return invalid('开售时间格式不正确')
    data.saleDate = value
  }

  if ('additionalSaleDates' in body) {
    const result = parseAdditionalSaleDates(body.additionalSaleDates)
    if (!result.ok) return result
    data.additionalSaleDates = result.data
  }

  if ('fromStation' in body) {
    const result = parseRequiredString(body.fromStation, '始发站', 50)
    if (!result.ok) return result
    data.fromStation = result.data
  }
  if ('toStation' in body) {
    const result = parseRequiredString(body.toStation, '终到站', 50)
    if (!result.ok) return result
    data.toStation = result.data
  }

  if ('seatType' in body) {
    if (typeof body.seatType !== 'string' || !SEAT_TYPES.has(body.seatType as SeatType)) {
      return invalid('座位类型不正确')
    }
    data.seatType = body.seatType as SeatType
  }

  if ('ticketCount' in body) {
    if (
      !Number.isInteger(body.ticketCount) ||
      Number(body.ticketCount) < 1 ||
      Number(body.ticketCount) > 5
    ) {
      return invalid('购票张数必须是 1 到 5 的整数')
    }
    data.ticketCount = Number(body.ticketCount)
  }

  if ('holidayName' in body) {
    const result = parseOptionalString(body.holidayName, '节假日信息', 100)
    if (!result.ok) return result
    data.holidayName = result.data
  }
  if ('remark' in body) {
    const result = parseOptionalString(body.remark, '备注', 500)
    if (!result.ok) return result
    data.remark = result.data
  }

  return { ok: true, data }
}

function parseAdditionalSaleDates(
  value: unknown
): ValidationResult<Date[]> {
  if (value === undefined) return { ok: true, data: [] }
  if (!Array.isArray(value) || value.length > 20) {
    return invalid('附加开售时间必须是最多 20 项的数组')
  }

  const dates = value.map(parseDateTime)
  if (dates.some((date) => date === null)) {
    return invalid('附加开售时间格式不正确')
  }
  return { ok: true, data: dates as Date[] }
}

function parseOptionalDateTime(
  value: unknown,
  label: string
): ValidationResult<Date | undefined> {
  if (value === undefined || value === null || value === '') {
    return { ok: true, data: undefined }
  }
  const date = parseDateTime(value)
  return date ? { ok: true, data: date } : invalid(`${label}格式不正确`)
}

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-](\d{2}):(\d{2}))$/
  )
  if (!match) return null
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0',
    offsetHourText = '0', offsetMinuteText = '0'] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = Number(offsetHourText)
  const offsetMinute = Number(offsetMinuteText)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null
}

function parseRequiredString(
  value: unknown,
  label: string,
  maxLength: number
): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim() === '') {
    return invalid(`${label}不能为空`)
  }
  const text = value.trim()
  return text.length <= maxLength
    ? { ok: true, data: text }
    : invalid(`${label}不能超过 ${maxLength} 个字符`)
}

function parseOptionalString(
  value: unknown,
  label: string,
  maxLength: number
): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') {
    return { ok: true, data: null }
  }
  if (typeof value !== 'string') return invalid(`${label}格式不正确`)
  const text = value.trim()
  return text.length <= maxLength
    ? { ok: true, data: text || null }
    : invalid(`${label}不能超过 ${maxLength} 个字符`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error }
}
