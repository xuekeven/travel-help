import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseTripPlaceInput, serializeTripPlace } from '@/lib/trip-place'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const trip = await prisma.trip.findUnique({ where: { id }, select: { id: true } })
  if (!trip) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  const places = await prisma.tripPlace.findMany({
    where: { tripId: id },
    orderBy: [{ plannedDate: 'asc' }, { plannedTime: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({ data: places.map(serializeTripPlace) })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, startDate: true, endDate: true },
  })
  if (!trip) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  const parsed = parseTripPlaceInput(await request.json().catch(() => null), trip)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const place = await prisma.tripPlace.create({
    data: { tripId: id, ...parsed.data },
  })

  return NextResponse.json({ data: serializeTripPlace(place) }, { status: 201 })
}
