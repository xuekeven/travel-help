import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripStatus, parseTripInput, serializeTrip } from '@/lib/trip'

const countSelection = {
  travelPlans: true,
  travelOrders: true,
  waitlistOrders: true,
  places: true,
} as const

export async function GET() {
  const trips = await prisma.trip.findMany({
    include: { _count: { select: countSelection } },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ data: trips.map(serializeTrip) })
}

export async function POST(request: NextRequest) {
  const parsed = parseTripInput(await request.json().catch(() => null))
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const input = parsed.data
  const trip = await prisma.trip.create({
    data: {
      ...input,
      status: getTripStatus(input.startDate, input.endDate),
    },
    include: { _count: { select: countSelection } },
  })

  return NextResponse.json({ data: serializeTrip(trip) }, { status: 201 })
}
