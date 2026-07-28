import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAutoPlanStatusForSaleDate,
  getDefaultSaleTime,
  getDaysUntilSaleDate,
} from '@/lib/date'
import { createMockPlan, getMockStore, isMockDataMode } from '@/lib/mock-data'
import { parsePlanCreateInput } from '@/lib/plan-validation'
import { syncPlanReminderTasks } from '@/lib/reminder-task'
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
  const body = await request.json().catch(() => null)
  const parsed = parsePlanCreateInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const input = parsed.data
  const saleDate = input.saleDate ?? getDefaultSaleTime(input.departureDate)

  if (isMockDataMode()) {
    const plan = createMockPlan({
      departureDate: input.departureDate.toISOString().slice(0, 10),
      saleDate: saleDate.toISOString(),
      additionalSaleDates: input.additionalSaleDates.map((date) => date.toISOString()),
      holidayName: input.holidayName,
      fromStation: input.fromStation,
      toStation: input.toStation,
      seatType: input.seatType,
      ticketCount: input.ticketCount,
      remark: input.remark,
    })
    return NextResponse.json({ data: withSaleInfo(plan) }, { status: 201 })
  }

  const plan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.travelPlan.create({
      data: {
        departureDate: input.departureDate,
        saleDate,
        additionalSaleDates: input.additionalSaleDates,
        holidayName: input.holidayName,
        fromStation: input.fromStation,
        toStation: input.toStation,
        seatType: input.seatType,
        ticketCount: input.ticketCount,
        status: getAutoPlanStatusForSaleDate(saleDate) as PlanStatus,
        remark: input.remark,
      },
    })

    await syncPlanReminderTasks(tx, createdPlan)
    return createdPlan
  })

  return NextResponse.json({ data: withSaleInfo(plan) }, { status: 201 })
}
