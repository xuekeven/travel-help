import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMockStore, isMockDataMode } from '@/lib/mock-data'
import { formatDateTimeShanghai } from '@/lib/date'
import { serializeTravelOrder } from '@/lib/travel-order'

export async function GET(request: NextRequest) {
  const sortDir = request.nextUrl.searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'

  const orders = isMockDataMode()
    ? [...getMockStore().travelOrders].sort((a, b) => {
        const dateDiff = a.departureDate.getTime() - b.departureDate.getTime()
        if (dateDiff !== 0) return sortDir === 'asc' ? dateDiff : -dateDiff
        const timeDiff = a.departureTime.localeCompare(b.departureTime)
        if (timeDiff !== 0) return sortDir === 'asc' ? timeDiff : -timeDiff
        return a.orderNo.localeCompare(b.orderNo)
      })
    : await prisma.travelOrder.findMany({
        orderBy: [
          { departureDate: sortDir },
          { departureTime: sortDir },
          { orderNo: 'asc' },
        ],
      })

  const data = orders.map((order) =>
    serializeTravelOrder(order as any)
  )
  const lastSynced = orders[0]?.syncedAt
    ? orders.reduce(
        (latest, order) => (order.syncedAt.getTime() > latest.getTime() ? order.syncedAt : latest),
        orders[0].syncedAt
      )
    : null

  return NextResponse.json({
    data,
    lastSynced: lastSynced ? lastSynced.toISOString() : null,
    lastSyncedLabel: lastSynced ? formatDateTimeShanghai(lastSynced) : null,
  })
}
