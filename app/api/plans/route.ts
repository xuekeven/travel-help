import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSaleDate, getDaysUntilSale, getAutoPlanStatus } from '@/lib/date'
import { createMockPlan, getMockStore, isMockDataMode } from '@/lib/mock-data'
import type { PlanStatus, TravelPlan as PrismaPlan } from '@prisma/client'

function withSaleInfo(plan: PrismaPlan) {
  return {
    ...plan,
    status: getAutoPlanStatus(plan.departureDate),
    departureDate: plan.departureDate.toISOString().slice(0, 10),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    saleDate: getSaleDate(plan.departureDate),
    daysUntilSale: getDaysUntilSale(plan.departureDate),
  }
}

export async function GET() {
  if (isMockDataMode()) {
    const plans = [...getMockStore().plans].sort(
      (a, b) => a.departureDate.getTime() - b.departureDate.getTime()
    )
    return NextResponse.json({ data: plans.map(withSaleInfo) })
  }

  const plans = await prisma.travelPlan.findMany({
    orderBy: { departureDate: 'asc' },
  })
  return NextResponse.json({ data: plans.map(withSaleInfo) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const departureDate = new Date(body.departureDate)

  if (isMockDataMode()) {
    const plan = createMockPlan({
      departureDate: body.departureDate,
      holidayName: body.holidayName || null,
      fromStation: body.fromStation,
      toStation: body.toStation,
      seatType: body.seatType,
      ticketCount: body.ticketCount ?? 1,
      remark: body.remark || null,
    })
    return NextResponse.json({ data: withSaleInfo(plan) }, { status: 201 })
  }

  const plan = await prisma.travelPlan.create({
    data: {
      departureDate,
      holidayName: body.holidayName || null,
      fromStation: body.fromStation,
      toStation: body.toStation,
      seatType: body.seatType,
      ticketCount: body.ticketCount ?? 1,
      status: getAutoPlanStatus(departureDate) as PlanStatus,
      remark: body.remark || null,
    },
  })
  return NextResponse.json({ data: withSaleInfo(plan) }, { status: 201 })
}
