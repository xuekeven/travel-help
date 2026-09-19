import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasValidSyncToken } from '@/lib/api-auth'
import { mergeExtensionCors, optionsExtensionCors } from '@/lib/extension-cors'
import { isMockDataMode, replaceMockTravelOrders } from '@/lib/mock-data'
import { syncTravelOrderReminderTasks } from '@/lib/reminder-task'
import { isValidNormalizedTravelOrder, normalizeTravelOrder } from '@/lib/travel-order'
import type { NormalizedTravelOrder } from '@/lib/travel-order'

export function OPTIONS() {
  return optionsExtensionCors()
}

export async function POST(request: NextRequest) {
  if (!isMockDataMode() && !hasValidSyncToken(request)) {
    return mergeExtensionCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const body = await request.json().catch(() => null)
  if (!isRecord(body) || !Array.isArray(body.orders) || body.orders.length > 500) {
    return mergeExtensionCors(
      NextResponse.json({ error: 'orders 必须是最多 500 项的数组' }, { status: 400 })
    )
  }

  let normalizedOrders: NormalizedTravelOrder[]
  try {
    normalizedOrders = body.orders.map((order) =>
      isRecord(order) ? normalizeTravelOrder(order) : null
    ).filter((order): order is NormalizedTravelOrder => Boolean(order))
  } catch {
    normalizedOrders = []
  }
  const uniqueOrderNumbers = new Set(normalizedOrders.map((order) => order.orderNo))
  if (
    normalizedOrders.length !== body.orders.length ||
    uniqueOrderNumbers.size !== normalizedOrders.length ||
    normalizedOrders.some((order) => !isValidNormalizedTravelOrder(order))
  ) {
    return mergeExtensionCors(
      NextResponse.json({ error: 'orders 数据格式不正确' }, { status: 400 })
    )
  }

  if (isMockDataMode()) {
    const count = replaceMockTravelOrders(body.orders)
    return mergeExtensionCors(NextResponse.json({ success: true, count }))
  }

  await prisma.$transaction(async (tx) => {
    const linkedOrders = await tx.travelOrder.findMany({
      where: { tripId: { not: null } },
      select: { orderNo: true, tripId: true },
    })
    const tripIdByOrderNo = new Map(linkedOrders.map((order) => [order.orderNo, order.tripId]))

    await tx.travelOrder.deleteMany({})

    if (normalizedOrders.length > 0) {
      await tx.travelOrder.createMany({
        data: normalizedOrders.map((order) => ({
          orderNo: order.orderNo,
          orderDate: order.orderDate,
          departureDate: order.departureDate,
          departureTime: order.departureTime,
          arrivalDate: order.arrivalDate,
          arrivalTime: order.arrivalTime,
          fromStation: order.fromStation,
          toStation: order.toStation,
          trainCode: order.trainCode,
          trainNo: order.trainNo,
          distance: order.distance,
          passengerNames: order.passengerNames,
          seatTypeNames: order.seatTypeNames,
          coachNames: order.coachNames,
          seatNames: order.seatNames,
          ticketTypeNames: order.ticketTypeNames,
          ticketStatusNames: order.ticketStatusNames,
          ticketCount: order.ticketCount,
          totalPrice: order.totalPrice,
          ticketSnapshots: order.ticketSnapshots,
          cancelFlag: order.cancelFlag,
          resignFlag: order.resignFlag,
          returnFlag: order.returnFlag,
          payFlag: order.payFlag,
          confirmFlag: order.confirmFlag,
          orderStatus: order.orderStatus,
          rawData: order.rawData ?? {},
          tripId: tripIdByOrderNo.get(order.orderNo) ?? null,
        })),
      })
    }

    await syncTravelOrderReminderTasks(tx, normalizedOrders)
  })

  return mergeExtensionCors(
    NextResponse.json({ success: true, count: normalizedOrders.length })
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
