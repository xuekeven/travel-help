import { addDays } from 'date-fns'
import {
  getAutoPlanStatusForSaleDate,
  getDefaultSaleTime,
  getSaleDate,
  getTodayCN,
} from '@/lib/date'
import { normalizeTravelOrder } from '@/lib/travel-order'
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
  saleDate: Date
  additionalSaleDates: Date[]
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

export type MockTravelOrder = ReturnType<typeof createMockTravelOrder>

type MockStore = {
  plans: MockTravelPlan[]
  waitlistOrders: MockWaitlistOrder[]
  travelOrders: MockTravelOrder[]
  planSeq: number
  waitlistSeq: number
  travelOrderSeq: number
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
  saleDate?: string
  additionalSaleDates?: string[]
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
  const saleDate = input.saleDate ? new Date(input.saleDate) : getDefaultSaleTime(departureDate)
  const plan: MockTravelPlan = {
    id: `mock-plan-${store.planSeq++}`,
    departureDate,
    saleDate,
    additionalSaleDates: (input.additionalSaleDates ?? []).map((value) => new Date(value)),
    holidayName: input.holidayName || null,
    fromStation: input.fromStation,
    toStation: input.toStation,
    seatType: input.seatType,
    ticketCount: input.ticketCount ?? 1,
    status: getAutoPlanStatusForSaleDate(saleDate),
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
    saleDate: string
    additionalSaleDates: string[]
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
  if (input.saleDate) plan.saleDate = new Date(input.saleDate)
  if (input.additionalSaleDates) {
    plan.additionalSaleDates = input.additionalSaleDates.map((value) => new Date(value))
  }
  if (input.holidayName !== undefined) plan.holidayName = input.holidayName || null
  if (input.fromStation) plan.fromStation = input.fromStation
  if (input.toStation) plan.toStation = input.toStation
  if (input.seatType) plan.seatType = input.seatType
  if (input.ticketCount !== undefined) plan.ticketCount = input.ticketCount
  if (input.remark !== undefined) plan.remark = input.remark || null

  plan.status = getAutoPlanStatusForSaleDate(plan.saleDate)
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

export function replaceMockTravelOrders(orders: any[]): number {
  const store = getMockStore()
  store.travelOrders = orders.map((order) => normalizeMockTravelOrder(order, store.travelOrderSeq++))
  return store.travelOrders.length
}

function createInitialStore(): MockStore {
  const today = new Date(getTodayCN())
  const plans: MockTravelPlan[] = [
    mockPlan(1, addDays(today, 3), '端午测试', '北京西', '邯郸东', 'SECOND_CLASS', 1, '临近出行'),
    mockPlan(
      2,
      addDays(today, 20),
      '暑期',
      '北京南',
      '上海虹桥',
      'FIRST_CLASS',
      2,
      '用于查看待开售状态',
      [new Date(`${getSaleDate(addDays(today, 20))}T08:30:00+08:00`)]
    ),
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

  const travelOrders: MockTravelOrder[] = [
    createMockTravelOrder(1, {
      orderNo: 'MOCK-TR-001',
      orderDate: addDays(today, -3),
      departureDate: addDays(today, 1),
      departureTime: '20:12',
      arrivalDate: addDays(today, 1),
      arrivalTime: '22:21',
      fromStation: '北京西',
      toStation: '邯郸东',
      trainCode: 'D927',
      trainNo: '240000D92729',
      distance: 456,
      passengerNames: ['薛凯'],
      seatTypeNames: ['二等座'],
      coachNames: ['01'],
      seatNames: ['04D号'],
      ticketTypeNames: ['成人票'],
      ticketStatusNames: ['已支付'],
      ticketCount: 1,
      totalPrice: 140.5,
      cancelFlag: 'N',
      resignFlag: '1',
      returnFlag: 'Y',
      payFlag: 'N',
      confirmFlag: 'N',
      orderStatus: '已支付',
    }),
    createMockTravelOrder(2, {
      orderNo: 'MOCK-TR-002',
      orderDate: addDays(today, -1),
      departureDate: addDays(today, 2),
      departureTime: '08:00',
      arrivalDate: addDays(today, 2),
      arrivalTime: '10:10',
      fromStation: '北京南',
      toStation: '天津南',
      trainCode: 'G123',
      trainNo: '240000G12345',
      distance: 127,
      passengerNames: ['薛凯', '张三'],
      seatTypeNames: ['二等座', '二等座'],
      coachNames: ['03', '03'],
      seatNames: ['05A号', '05B号'],
      ticketTypeNames: ['成人票', '成人票'],
      ticketStatusNames: ['已支付', '已支付'],
      ticketCount: 2,
      totalPrice: 120.0,
      cancelFlag: 'N',
      resignFlag: '1',
      returnFlag: 'N',
      payFlag: 'Y',
      confirmFlag: 'N',
      orderStatus: '已支付',
    }),
    createMockTravelOrder(3, {
      orderNo: 'MOCK-TR-003',
      orderDate: addDays(today, -5),
      departureDate: addDays(today, 5),
      departureTime: '13:45',
      arrivalDate: addDays(today, 5),
      arrivalTime: '16:08',
      fromStation: '广州南',
      toStation: '长沙南',
      trainCode: 'G456',
      trainNo: '240000G45678',
      distance: 701,
      passengerNames: ['李四'],
      seatTypeNames: ['一等座'],
      coachNames: ['05'],
      seatNames: ['08C号'],
      ticketTypeNames: ['成人票'],
      ticketStatusNames: ['待支付'],
      ticketCount: 1,
      totalPrice: 286.5,
      cancelFlag: 'N',
      resignFlag: 'N',
      returnFlag: 'N',
      payFlag: 'N',
      confirmFlag: 'N',
      orderStatus: '待支付',
    }),
  ]

  return {
    plans,
    waitlistOrders,
    travelOrders,
    planSeq: plans.length + 1,
    waitlistSeq: waitlistOrders.length + 1,
    travelOrderSeq: travelOrders.length + 1,
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
  remark: string | null,
  additionalSaleDates: Date[] = []
): MockTravelPlan {
  const now = new Date()
  const saleDate = getDefaultSaleTime(departureDate)
  return {
    id: `mock-plan-${index}`,
    departureDate,
    saleDate,
    additionalSaleDates,
    holidayName,
    fromStation,
    toStation,
    seatType,
    ticketCount,
    status: getAutoPlanStatusForSaleDate(saleDate),
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
      train_date: formatDateOnlyLocal(departureDate),
      from_station_name: input.fromStation,
      to_station_name: input.toStation,
      board_train_code: trainCode,
      seat_name: input.seatType,
      start_time: input.departureTime,
      arrive_time: input.arrivalTime,
    })),
  }
}

function formatDateOnlyLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function createMockTravelOrder(
  index: number,
  input: {
    orderNo: string
    orderDate: Date
    departureDate: Date
    departureTime: string
    arrivalDate: Date | null
    arrivalTime: string
    fromStation: string
    toStation: string
    trainCode: string
    trainNo: string | null
    distance: number | null
    passengerNames: string[]
    seatTypeNames: string[]
    coachNames: string[]
    seatNames: string[]
    ticketTypeNames: string[]
    ticketStatusNames: string[]
    ticketCount: number
    totalPrice: number
    cancelFlag: string | null
    resignFlag: string | null
    returnFlag: string | null
    payFlag: string | null
    confirmFlag: string | null
    orderStatus: string | null
  }
) {
  const now = new Date()
  const rawData = createTravelOrderRawData(input)
  const rawOrder = rawData.data.OrderDTODataList[0]
  const normalized = normalizeTravelOrder(rawOrder)
  if (!normalized) throw new Error('Failed to create mock travel order')

  return {
    id: `mock-travel-order-${index}`,
    ...normalized,
    rawData: rawOrder,
    syncedAt: now,
    createdAt: now,
  }
}

function normalizeMockTravelOrder(order: any, seq: number): MockTravelOrder {
  const normalized = normalizeTravelOrder(order)
  if (!normalized) {
    throw new Error(`Invalid travel order payload for mock sync: ${order?.sequence_no ?? seq}`)
  }
  const now = new Date()
  return {
    id: `mock-travel-order-sync-${seq}`,
    ...normalized,
    rawData: order,
    syncedAt: now,
    createdAt: now,
  }
}

function createTravelOrderRawData(input: {
  orderNo: string
  orderDate: Date
  departureDate: Date
  departureTime: string
  arrivalDate: Date | null
  arrivalTime: string
  fromStation: string
  toStation: string
  trainCode: string
  trainNo: string | null
  distance: number | null
  passengerNames: string[]
  seatTypeNames: string[]
  coachNames: string[]
  seatNames: string[]
  ticketTypeNames: string[]
  ticketStatusNames: string[]
  ticketCount: number
  totalPrice: number
  cancelFlag: string | null
  resignFlag: string | null
  returnFlag: string | null
  payFlag: string | null
  confirmFlag: string | null
  orderStatus: string | null
}) {
  const departureDateText = formatDateOnlyLocal(input.departureDate)
  const arrivalDateText = input.arrivalDate ? formatDateOnlyLocal(input.arrivalDate) : departureDateText
  const orderDateText = formatDateTimeLocal(input.orderDate)
  const tickets = Array.from({ length: input.ticketCount }, (_, index) => ({
    stationTrainDTO: {
      trainDTO: {
        train_no: input.trainNo,
        train_code: input.trainCode,
        start_station_telecode: '',
        end_station_telecode: '',
        start_date_str: departureDateText.replace(/-/g, ''),
      },
      station_train_code: input.trainCode,
      from_station_telecode: '',
      from_station_name: input.fromStation,
      start_time: `1970-01-01 ${input.departureTime}:00`,
      to_station_telecode: '',
      to_station_name: input.toStation,
      arrive_time: `1970-01-01 ${input.arrivalTime}:00`,
      distance: input.distance == null ? '' : String(input.distance),
      start_time_local: `1970-01-01 ${input.departureTime}:00`,
      arrive_time_local: `1970-01-01 ${input.arrivalTime}:00`,
      arrive_date_local: `${arrivalDateText} 00:00:00`,
    },
    passengerDTO: {
      passenger_name: input.passengerNames[index] ?? `乘客${index + 1}`,
    },
    ticket_no: `${input.orderNo}${index + 1}`,
    sequence_no: input.orderNo,
    batch_no: '1',
    train_date: `${departureDateText} 00:00:00`,
    train_date_local: `${departureDateText} 00:00:00`,
    coach_no: input.coachNames[index] ?? input.coachNames[0] ?? '01',
    coach_name: input.coachNames[index] ?? input.coachNames[0] ?? '01',
    seat_no: input.seatNames[index] ?? input.seatNames[0] ?? '00A',
    seat_name: input.seatNames[index] ?? input.seatNames[0] ?? '00A号',
    seat_flag: '0',
    seat_type_code: 'O',
    seat_type_name: input.seatTypeNames[index] ?? input.seatTypeNames[0] ?? '二等座',
    ticket_type_code: '1',
    ticket_type_name: input.ticketTypeNames[index] ?? input.ticketTypeNames[0] ?? '成人票',
    reserve_time: orderDateText,
    limit_time: orderDateText,
    lose_time: '2099-01-01 01:01:01',
    pay_limit_time: '2099-01-01 01:01:01',
    ticket_price: input.totalPrice * 10,
    print_eticket_flag: 'Y',
    eticket_flag: '1',
    resign_flag: input.resignFlag ?? 'N',
    return_flag: input.returnFlag ?? 'N',
    return_msg: '',
    confirm_flag: input.confirmFlag ?? 'N',
    pay_mode_code: 'Z',
    ticket_status_code: '',
    ticket_status_name: input.ticketStatusNames[index] ?? input.ticketStatusNames[0] ?? '已支付',
    cancel_flag: input.cancelFlag ?? 'N',
    amount_char: 0,
    trade_mode: 'J',
    start_train_date_page: `${departureDateText} ${input.departureTime}`,
    str_ticket_price_page: String(input.totalPrice),
    come_go_traveller_ticket_page: 'N',
    return_deliver_flag: 'N',
    deliver_fee_char: '',
    is_need_alert_flag: false,
    is_deliver: 'N',
    dynamicProp: '',
    fee_char: '',
    insure_query_no: '',
    column_nine_msg: '',
    lc_flag: '',
    integral_pay_flag: 'N',
    trms_price_rate: '',
    trms_price_number: '',
    trms_service_code: '',
    ext_ticket_no: `${input.orderNo}-EXT`,
    book_user_name: 'mock-user',
    sale_mode_type: 'G',
    if_cash: 'N',
    alternate_flag: 'N',
    has608Message: '',
    invoice_state: '0',
    offline_return_date: '20991231',
    purpose_code: '02',
    trade_no: `${input.orderNo}-TRADE`,
    resign_info: '',
    feature_label: '',
    dw_flag: '0#0#N#N#',
    syx_flag: '0',
    preference_rate: 1.0,
    preference_word: '',
  }))

  return {
    validateMessagesShowId: '_validatorMessage',
    status: true,
    httpstatus: 200,
    data: {
      order_total_number: '1',
      show_catering_button: true,
      OrderDTODataList: [
        {
          sequence_no: input.orderNo,
          order_date: orderDateText,
          ticket_totalnum: input.ticketCount,
          ticket_price_all: input.totalPrice * 10,
          cancel_flag: input.cancelFlag ?? 'N',
          resign_flag: input.resignFlag ?? 'N',
          return_flag: input.returnFlag ?? 'N',
          print_eticket_flag: 'Y',
          pay_flag: input.payFlag ?? 'N',
          pay_resign_flag: 'N',
          confirm_flag: input.confirmFlag ?? 'N',
          tickets,
          reserve_flag_query: 'p',
          if_show_resigning_info: 'N',
          recordCount: '1',
          isNeedSendMailAndMsg: 'N',
          array_passser_name_page: input.passengerNames,
          from_station_name_page: [input.fromStation],
          to_station_name_page: [input.toStation],
          start_train_date_page: `${departureDateText} ${input.departureTime}`,
          start_time_page: input.departureTime,
          arrive_time_page: input.arrivalTime,
          train_code_page: input.trainCode,
          ticket_total_price_page: String(input.totalPrice),
          come_go_traveller_order_page: 'N',
          canOffLinePay: 'N',
          if_deliver: 'N',
          insure_query_no: '',
          syx_flag: '0',
          status_name: input.orderStatus ?? input.ticketStatusNames[0] ?? '已支付',
        },
      ],
    },
    messages: [],
    validateMessages: {},
  }
}
