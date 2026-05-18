import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mergeExtensionCors, optionsExtensionCors } from '@/lib/extension-cors'

export function OPTIONS() {
  return optionsExtensionCors()
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-sync-token')
  if (token !== process.env.EXTENSION_SYNC_TOKEN) {
    return mergeExtensionCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const body = await request.json()
  const { orders } = body

  if (!Array.isArray(orders) || orders.length === 0) {
    return mergeExtensionCors(NextResponse.json({ error: 'orders 不能为空' }, { status: 400 }))
  }

  await Promise.all(
    orders.map((order: any) =>
      prisma.waitlistOrder.upsert({
        where: { orderNo: order.orderNo },
        create: {
          orderNo: order.orderNo,
          departureDate: new Date(order.departureDate),
          fromStation: order.fromStation,
          toStation: order.toStation,
          trainNumbers: order.trainNumbers,
          seatType: order.seatType,
          ticketCount: order.ticketCount,
          price: order.price,
          departureTime: order.departureTime,
          arrivalTime: order.arrivalTime,
          status: order.status,
          rawData: order.rawData ?? {},
        },
        update: {
          trainNumbers: order.trainNumbers,
          status: order.status,
          rawData: order.rawData ?? {},
        },
      })
    )
  )

  return mergeExtensionCors(NextResponse.json({ success: true, count: orders.length }))
}
