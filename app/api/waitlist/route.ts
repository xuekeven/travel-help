import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildNeedSegmentsForOrder } from '@/lib/waitlist-need-segments'
import { getMockStore, isMockDataMode } from '@/lib/mock-data'
import type { WaitlistGroup } from '@/types'

export async function GET(request: NextRequest) {
  const sortBy = request.nextUrl.searchParams.get('sortBy') ?? 'departureTime'
  const sortDir = (request.nextUrl.searchParams.get('sortDir') ?? 'asc') as 'asc' | 'desc'

  const orders = isMockDataMode()
    ? [...getMockStore().waitlistOrders].sort((a, b) => {
        const dateDiff = a.departureDate.getTime() - b.departureDate.getTime()
        if (dateDiff !== 0) return dateDiff

        const sortDiff =
          sortBy === 'price'
            ? Number(a.price) - Number(b.price)
            : a.departureTime.localeCompare(b.departureTime)

        return sortDir === 'asc' ? sortDiff : -sortDiff
      })
    : await prisma.waitlistOrder.findMany({
        orderBy:
          sortBy === 'price'
            ? [{ departureDate: 'asc' }, { price: sortDir }]
            : [{ departureDate: 'asc' }, { departureTime: sortDir }],
      })

  const groupMap = new Map<string, WaitlistGroup>()
  for (const order of orders) {
    const dateStr = order.departureDate.toISOString().slice(0, 10)
    const key = `${dateStr}|${order.fromStation}|${order.toStation}`

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        departureDate: dateStr,
        fromStation: order.fromStation,
        toStation: order.toStation,
        orders: [],
      })
    }

    groupMap.get(key)!.orders.push({
      id: order.id,
      orderNo: order.orderNo,
      departureDate: dateStr,
      fromStation: order.fromStation,
      toStation: order.toStation,
      trainNumbers: order.trainNumbers,
      seatType: order.seatType,
      ticketCount: order.ticketCount,
      price: Number(order.price),
      departureTime: order.departureTime,
      arrivalTime: order.arrivalTime,
      status: order.status,
      syncedAt: order.syncedAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      needSegments: buildNeedSegmentsForOrder({
        rawData: order.rawData,
        trainNumbers: order.trainNumbers,
        fromStation: order.fromStation,
        toStation: order.toStation,
        departureTime: order.departureTime,
        arrivalTime: order.arrivalTime,
        seatType: order.seatType,
      }),
    })
  }

  return NextResponse.json({ data: Array.from(groupMap.values()) })
}
