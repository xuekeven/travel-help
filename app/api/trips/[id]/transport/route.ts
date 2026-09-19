import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { TripTransportItem, TripTransportKind } from '@/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const trip = await prisma.trip.findUnique({ where: { id } })
  if (!trip) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  const dateCandidate = {
    OR: [
      { tripId: id },
      {
        tripId: null,
        departureDate: { gte: trip.startDate, lte: trip.endDate },
      },
    ],
  }

  const [plans, orders, waitlistOrders] = await Promise.all([
    prisma.travelPlan.findMany({ where: dateCandidate }),
    prisma.travelOrder.findMany({ where: dateCandidate }),
    prisma.waitlistOrder.findMany({ where: dateCandidate }),
  ])

  const items: TripTransportItem[] = [
    ...plans.map((plan) => ({
      kind: 'PLAN' as const,
      id: plan.id,
      date: plan.departureDate.toISOString().slice(0, 10),
      time: null,
      fromStation: plan.fromStation,
      toStation: plan.toStation,
      code: null,
      status: plan.status,
      linked: plan.tripId === id,
    })),
    ...orders.map((order) => ({
      kind: 'ORDER' as const,
      id: order.id,
      date: order.departureDate.toISOString().slice(0, 10),
      time: order.departureTime,
      fromStation: order.fromStation,
      toStation: order.toStation,
      code: order.trainCode,
      status: order.orderStatus ?? (order.ticketStatusNames.join('、') || '已出票'),
      linked: order.tripId === id,
    })),
    ...waitlistOrders.map((order) => ({
      kind: 'WAITLIST' as const,
      id: order.id,
      date: order.departureDate.toISOString().slice(0, 10),
      time: order.departureTime,
      fromStation: order.fromStation,
      toStation: order.toStation,
      code: order.trainNumbers.join(' / '),
      status: order.status,
      linked: order.tripId === id,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  return NextResponse.json({ data: items })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json().catch(() => null) as {
    kind?: TripTransportKind
    recordId?: string
    linked?: boolean
  } | null

  if (!body?.kind || !body.recordId || typeof body.linked !== 'boolean') {
    return NextResponse.json({ error: '关联参数不完整' }, { status: 400 })
  }

  const trip = await prisma.trip.findUnique({ where: { id }, select: { id: true } })
  if (!trip) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  const data = { tripId: body.linked ? id : null }
  const unlinkWhere = { id: body.recordId, tripId: id }
  let count = 0

  if (body.kind === 'PLAN') {
    const result = await prisma.travelPlan.updateMany({
      where: body.linked ? { id: body.recordId } : unlinkWhere,
      data,
    })
    count = result.count
  } else if (body.kind === 'ORDER') {
    const result = await prisma.travelOrder.updateMany({
      where: body.linked ? { id: body.recordId } : unlinkWhere,
      data,
    })
    count = result.count
  } else if (body.kind === 'WAITLIST') {
    const result = await prisma.waitlistOrder.updateMany({
      where: body.linked ? { id: body.recordId } : unlinkWhere,
      data,
    })
    count = result.count
  } else {
    return NextResponse.json({ error: '不支持的交通记录类型' }, { status: 400 })
  }

  if (count === 0) return NextResponse.json({ error: '交通记录不存在' }, { status: 404 })
  return NextResponse.json({ success: true })
}
