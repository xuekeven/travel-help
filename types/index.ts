export type SeatType =
  | 'SECOND_CLASS'
  | 'FIRST_CLASS'
  | 'BUSINESS'
  | 'HARD_SLEEPER'
  | 'SOFT_SLEEPER'
  | 'HARD_SEAT'
  | 'NO_SEAT'

export type PlanStatus =
  | 'PENDING_SALE'
  | 'ON_SALE'

export interface TravelPlan {
  id: string
  departureDate: string
  holidayName: string | null
  fromStation: string
  toStation: string
  seatType: SeatType
  ticketCount: number
  status: PlanStatus
  remark: string | null
  createdAt: string
  updatedAt: string
  saleDate: string
  daysUntilSale: number
}

/** 单条候补方案（对应 12306 needs[] 的一项），用于车次/发到站/时刻展示 */
export interface WaitlistNeedSegment {
  index: number
  trainCode: string
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  seatType: string
}

export interface WaitlistOrder {
  id: string
  orderNo: string
  departureDate: string
  fromStation: string
  toStation: string
  trainNumbers: string[]
  seatType: string
  ticketCount: number
  price: number
  departureTime: string
  arrivalTime: string
  status: string
  syncedAt: string
  createdAt: string
  /** 由接口根据 rawData.needs 计算；前端用于图二式分行展示 */
  needSegments: WaitlistNeedSegment[]
}

export interface WaitlistGroup {
  groupKey: string
  departureDate: string
  fromStation: string
  toStation: string
  orders: WaitlistOrder[]
}

export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  SECOND_CLASS: '二等座',
  FIRST_CLASS: '一等座',
  BUSINESS: '商务座',
  HARD_SLEEPER: '硬卧',
  SOFT_SLEEPER: '软卧',
  HARD_SEAT: '硬座',
  NO_SEAT: '无座',
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  PENDING_SALE: '待开售',
  ON_SALE: '已开售',
}

export const PLAN_STATUS_COLORS: Record<PlanStatus, string> = {
  PENDING_SALE: 'default',
  ON_SALE: 'processing',
}
