import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAutoPlanStatusForSaleDate,
  getDefaultSaleTime,
  getDaysUntilSaleDate,
} from '@/lib/date'
import { createMockPlan, getMockStore, isMockDataMode } from '@/lib/mock-data'
import type { PlanStatus, TravelPlan as PrismaPlan } from '@prisma/client'

function withSaleInfo(plan: PrismaPlan) {
  const saleDate = plan.saleDate ?? getDefaultSaleTime(plan.departureDate)
  const additionalSaleDates = plan.additionalSaleDates ?? []
  return {
    ...plan,
    status: getAutoPlanStatusForSaleDate(saleDate),
    departureDate: plan.departureDate.toISOString().slice(0, 10),
    saleDate: saleDate.toISOString(),
    additionalSaleDates: additionalSaleDates.map((value) => value.toISOString()),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    daysUntilSale: getDaysUntilSaleDate(saleDate),
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
  const saleDate = body.saleDate ? new Date(body.saleDate) : getDefaultSaleTime(departureDate)
  const additionalSaleDates = Array.isArray(body.additionalSaleDates)
    ? body.additionalSaleDates.map((value: string) => new Date(value))
    : []

  if (isMockDataMode()) {
    const plan = createMockPlan({
      departureDate: body.departureDate,
      saleDate: body.saleDate,
      additionalSaleDates: body.additionalSaleDates,
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
      saleDate,
      additionalSaleDates,
      holidayName: body.holidayName || null,
      fromStation: body.fromStation,
      toStation: body.toStation,
      seatType: body.seatType,
      ticketCount: body.ticketCount ?? 1,
      status: getAutoPlanStatusForSaleDate(saleDate) as PlanStatus,
      remark: body.remark || null,
    },
  })
  return NextResponse.json({ data: withSaleInfo(plan) }, { status: 201 })
}
