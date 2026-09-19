import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripStatus, parseTripInput, serializeTrip } from '@/lib/trip'

type Params = { params: Promise<{ id: string }> }

const countSelection = {
  travelPlans: true,
  travelOrders: true,
  waitlistOrders: true,
  places: true,
} as const

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { _count: { select: countSelection } },
  })

  if (!trip) return NextResponse.json({ error: '行程不存在' }, { status: 404 })
  return NextResponse.json({ data: serializeTrip(trip) })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const parsed = parseTripInput(await request.json().catch(() => null))
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const existing = await prisma.trip.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  const input = parsed.data
  const placesOutsideRange = await prisma.tripPlace.count({
    where: {
      tripId: id,
      plannedDate: { not: null },
      OR: [
        { plannedDate: { lt: input.startDate } },
        { plannedDate: { gt: input.endDate } },
      ],
    },
  })
  if (placesOutsideRange > 0) {
    return NextResponse.json(
      { error: '已有地点安排在新的旅行日期范围之外，请先调整地点日期' },
      { status: 400 }
    )
  }

  const trip = await prisma.trip.update({
    where: { id },
    data: {
      ...input,
      status: getTripStatus(input.startDate, input.endDate),
    },
    include: { _count: { select: countSelection } },
  })

  return NextResponse.json({ data: serializeTrip(trip) })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const existing = await prisma.trip.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  await prisma.trip.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
