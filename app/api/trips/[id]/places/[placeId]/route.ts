import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseTripPlaceInput, serializeTripPlace } from '@/lib/trip-place'

type Params = { params: Promise<{ id: string; placeId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id, placeId } = await params
  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, startDate: true, endDate: true },
  })
  if (!trip) return NextResponse.json({ error: '行程不存在' }, { status: 404 })

  const existing = await prisma.tripPlace.findFirst({
    where: { id: placeId, tripId: id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: '地点不存在' }, { status: 404 })

  const parsed = parseTripPlaceInput(await request.json().catch(() => null), trip)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const place = await prisma.tripPlace.update({
    where: { id: placeId },
    data: parsed.data,
  })

  return NextResponse.json({ data: serializeTripPlace(place) })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, placeId } = await params
  const result = await prisma.tripPlace.deleteMany({ where: { id: placeId, tripId: id } })
  if (result.count === 0) return NextResponse.json({ error: '地点不存在' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
