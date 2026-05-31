import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mergeExtensionCors, optionsExtensionCors } from '@/lib/extension-cors'
import { isMockDataMode, replaceMockTravelOrders } from '@/lib/mock-data'
import { normalizeTravelOrder } from '@/lib/travel-order'
import type { NormalizedTravelOrder } from '@/lib/travel-order'

export function OPTIONS() {
  return optionsExtensionCors()
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-sync-token')
  if (!isMockDataMode() && token !== process.env.EXTENSION_SYNC_TOKEN) {
    return mergeExtensionCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const body = await request.json()
  const orders = Array.isArray(body?.orders) ? body.orders : []

  if (orders.some((order: any) => !normalizeTravelOrder(order))) {
    return mergeExtensionCors(
      NextResponse.json({ error: 'orders 数据格式不正确' }, { status: 400 })
    )
  }

  if (isMockDataMode()) {
    const count = replaceMockTravelOrders(orders)
    return mergeExtensionCors(NextResponse.json({ success: true, count }))
  }

  await prisma.$transaction(async (tx) => {
    await tx.travelOrder.deleteMany({})

    if (orders.length === 0) return

    const normalizedOrders: NormalizedTravelOrder[] = orders.map((order: any) => normalizeTravelOrder(order)!)

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
      })),
    })
  })

  return mergeExtensionCors(NextResponse.json({ success: true, count: orders.length }))
}
