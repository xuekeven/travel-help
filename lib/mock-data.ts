import { addDays } from 'date-fns'
import { getAutoPlanStatus, getTodayCN } from '@/lib/date'
import type { Prisma } from '@prisma/client'

type SeatType =
  | 'SECOND_CLASS'
  | 'FIRST_CLASS'
  | 'BUSINESS'
  | 'HARD_SLEEPER'
  | 'SOFT_SLEEPER'
  | 'HARD_SEAT'
  | 'NO_SEAT'

type PlanStatus = 'PENDING_SALE' | 'ON_SALE'

export type MockTravelPlan = {
  id: string
  departureDate: Date
  holidayName: string | null
  fromStation: string
  toStation: string
  seatType: SeatType
  ticketCount: number
  status: PlanStatus
  remark: string | null
  createdAt: Date
  updatedAt: Date
}

export type MockWaitlistOrder = {
  id: string
  orderNo: string
  departureDate: Date
  fromStation: string
  toStation: string
  trainNumbers: string[]
  seatType: string
  ticketCount: number
  price: number
  departureTime: string
  arrivalTime: string
  status: string
  rawData: Prisma.JsonValue
  syncedAt: Date
  createdAt: Date
}

type MockStore = {
  plans: MockTravelPlan[]
  waitlistOrders: MockWaitlistOrder[]
  planSeq: number
  waitlistSeq: number
}

const globalForMock = globalThis as unknown as {
  mock12306Store: MockStore | undefined
}

export function isMockDataMode(): boolean {
  return process.env.MOCK_DATA === '1'
}

export function getMockStore(): MockStore {
  if (!globalForMock.mock12306Store) {
    globalForMock.mock12306Store = createInitialStore()
  }
  return globalForMock.mock12306Store
}

export function createMockPlan(input: {
  departureDate: string
  holidayName?: string | null
  fromStation: string
  toStation: string
  seatType: SeatType
  ticketCount?: number
  remark?: string | null
}): MockTravelPlan {
  const store = getMockStore()
  const now = new Date()
  const departureDate = new Date(input.departureDate)
  const plan: MockTravelPlan = {
    id: `mock-plan-${store.planSeq++}`,
    departureDate,
    holidayName: input.holidayName || null,
    fromStation: input.fromStation,
    toStation: input.toStation,
    seatType: input.seatType,
    ticketCount: input.ticketCount ?? 1,
    status: getAutoPlanStatus(departureDate),
    remark: input.remark || null,
    createdAt: now,
    updatedAt: now,
  }
  store.plans.push(plan)
  return plan
}

export function updateMockPlan(
  id: string,
  input: Partial<{
    departureDate: string
    holidayName: string | null
    fromStation: string
    toStation: string
    seatType: SeatType
    ticketCount: number
    remark: string | null
  }>
): MockTravelPlan | null {
  const store = getMockStore()
  const plan = store.plans.find((item) => item.id === id)
  if (!plan) return null

  if (input.departureDate) plan.departureDate = new Date(input.departureDate)
  if (input.holidayName !== undefined) plan.holidayName = input.holidayName || null
  if (input.fromStation) plan.fromStation = input.fromStation
  if (input.toStation) plan.toStation = input.toStation
  if (input.seatType) plan.seatType = input.seatType
  if (input.ticketCount !== undefined) plan.ticketCount = input.ticketCount
  if (input.remark !== undefined) plan.remark = input.remark || null

  plan.status = getAutoPlanStatus(plan.departureDate)
  plan.updatedAt = new Date()
  return plan
}

export function deleteMockPlan(id: string): boolean {
  const store = getMockStore()
  const nextPlans = store.plans.filter((plan) => plan.id !== id)
  const deleted = nextPlans.length !== store.plans.length
  store.plans = nextPlans
  return deleted
}

export function replaceMockWaitlistOrders(orders: any[]): number {
  const store = getMockStore()
  store.waitlistOrders = orders.map((order) => normalizeWaitlistOrder(order, store.waitlistSeq++))
  return store.waitlistOrders.length
}

function createInitialStore(): MockStore {
  const today = new Date(getTodayCN())
  const plans: MockTravelPlan[] = [
    mockPlan(1, addDays(today, 3), '端午测试', '北京西', '邯郸东', 'SECOND_CLASS', 1, '临近出行'),
    mockPlan(2, addDays(today, 20), '暑期', '北京南', '上海虹桥', 'FIRST_CLASS', 2, '用于查看待开售状态'),
    mockPlan(3, addDays(today, 32), null, '广州南', '长沙南', 'SECOND_CLASS', 1, null),
  ]

  const waitlistOrders: MockWaitlistOrder[] = [
    mockWaitlistOrder(1, addDays(today, 1), {
      orderNo: 'MOCK-WL-001',
      fromStation: '北京西',
      toStation: '邯郸东',
      trainNumbers: ['G673', 'G671'],
      seatType: '二等座',
      ticketCount: 1,
      price: 214.5,
      departureTime: '08:13',
      arrivalTime: '10:01',
      status: '待兑现',
    }),
    mockWaitlistOrder(2, addDays(today, 2), {
      orderNo: 'MOCK-WL-002',
      fromStation: '邯郸东',
      toStation: '北京西',
      trainNumbers: ['G672'],
      seatType: '二等座',
      ticketCount: 1,
      price: 214.5,
      departureTime: '18:24',
      arrivalTime: '20:12',
      status: '待兑现',
    }),
    mockWaitlistOrder(3, addDays(today, 1), {
      orderNo: 'MOCK-WL-003',
      fromStation: '北京西',
      toStation: '邯郸东',
      trainNumbers: ['G673', 'G675'],
      seatType: '二等座',
      ticketCount: 1,
      price: 198.0,
      departureTime: '09:42',
      arrivalTime: '11:20',
      status: '待兑现',
    }),
    mockWaitlistOrder(4, addDays(today, 1), {
      orderNo: 'MOCK-WL-004',
      fromStation: '北京西',
      toStation: '邯郸东',
      trainNumbers: ['G677'],
      seatType: '二等座',
      ticketCount: 1,
      price: 236.0,
      departureTime: '06:58',
      arrivalTime: '08:44',
      status: '待兑现',
    }),
    mockWaitlistOrder(5, addDays(today, 2), {
      orderNo: 'MOCK-WL-005',
      fromStation: '邯郸东',
      toStation: '北京西',
      trainNumbers: ['G678'],
      seatType: '二等座',
      ticketCount: 1,
      price: 176.0,
      departureTime: '19:11',
      arrivalTime: '20:57',
      status: '待兑现',
    }),
    mockWaitlistOrder(6, addDays(today, 5), {
      orderNo: 'MOCK-WL-006',
      fromStation: '北京南',
      toStation: '天津南',
      trainNumbers: ['C2051'],
      seatType: '一等座',
      ticketCount: 2,
      price: 176,
      departureTime: '12:10',
      arrivalTime: '12:43',
      status: '已兑现',
    }),
  ]

  return {
    plans,
    waitlistOrders,
    planSeq: plans.length + 1,
    waitlistSeq: waitlistOrders.length + 1,
  }
}

function mockPlan(
  index: number,
  departureDate: Date,
  holidayName: string | null,
  fromStation: string,
  toStation: string,
  seatType: SeatType,
  ticketCount: number,
  remark: string | null
): MockTravelPlan {
  const now = new Date()
  return {
    id: `mock-plan-${index}`,
    departureDate,
    holidayName,
    fromStation,
    toStation,
    seatType,
    ticketCount,
    status: getAutoPlanStatus(departureDate),
    remark,
    createdAt: now,
    updatedAt: now,
  }
}

function mockWaitlistOrder(
  index: number,
  departureDate: Date,
  input: Omit<MockWaitlistOrder, 'id' | 'departureDate' | 'rawData' | 'syncedAt' | 'createdAt'>
): MockWaitlistOrder {
  const now = new Date()
  return {
    id: `mock-waitlist-${index}`,
    departureDate,
    rawData: createWaitlistRawData(departureDate, input),
    syncedAt: now,
    createdAt: now,
    ...input,
  }
}

function normalizeWaitlistOrder(order: any, seq: number): MockWaitlistOrder {
  const now = new Date()
  const departureDate = new Date(order.departureDate)
  const normalized = {
    id: `mock-waitlist-sync-${seq}`,
    orderNo: order.orderNo,
    departureDate,
    fromStation: order.fromStation,
    toStation: order.toStation,
    trainNumbers: order.trainNumbers ?? [],
    seatType: order.seatType ?? '',
    ticketCount: order.ticketCount ?? 1,
    price: Number(order.price ?? 0),
    departureTime: order.departureTime ?? '',
    arrivalTime: order.arrivalTime ?? '',
    status: order.status ?? '',
    rawData: order.rawData ?? {},
    syncedAt: now,
    createdAt: now,
  }

  return {
    ...normalized,
    rawData:
      Object.keys(normalized.rawData).length > 0
        ? normalized.rawData
        : createWaitlistRawData(departureDate, normalized),
  }
}

function createWaitlistRawData(
  departureDate: Date,
  input: Pick<
    MockWaitlistOrder,
    | 'orderNo'
    | 'fromStation'
    | 'toStation'
    | 'trainNumbers'
    | 'seatType'
    | 'ticketCount'
    | 'price'
    | 'departureTime'
    | 'arrivalTime'
    | 'status'
  >
) {
  return {
    reserve_no: input.orderNo,
    status_name: input.status,
    prepay_amount: String(input.price),
    passengers: Array.from({ length: input.ticketCount }, (_, index) => ({ passenger_name: `乘客${index + 1}` })),
    needs: input.trainNumbers.map((trainCode) => ({
      train_date: departureDate.toISOString().slice(0, 10),
      from_station_name: input.fromStation,
      to_station_name: input.toStation,
      board_train_code: trainCode,
      seat_name: input.seatType,
      start_time: input.departureTime,
      arrive_time: input.arrivalTime,
    })),
  }
}
