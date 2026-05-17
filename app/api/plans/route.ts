import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSaleDate, getDaysUntilSale } from '@/lib/date'
import type { TravelPlan as PrismaPlan } from '@prisma/client'

function withSaleInfo(plan: PrismaPlan) {
  return {
    ...plan,
    departureDate: plan.departureDate.toISOString().slice(0, 10),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    saleDate: getSaleDate(plan.departureDate),
    daysUntilSale: getDaysUntilSale(plan.departureDate),
  }
}

export async function GET() {
  const plans = await prisma.travelPlan.findMany({
    orderBy: { departureDate: 'asc' },
  })
  return NextResponse.json({ data: plans.map(withSaleInfo) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const plan = await prisma.travelPlan.create({
    data: {
      departureDate: new Date(body.departureDate),
      holidayName: body.holidayName || null,
      fromStation: body.fromStation,
      toStation: body.toStation,
      seatType: body.seatType,
      ticketCount: body.ticketCount ?? 1,
      status: body.status ?? 'PENDING_SALE',
      remark: body.remark || null,
    },
  })
  return NextResponse.json({ data: withSaleInfo(plan) }, { status: 201 })
}
