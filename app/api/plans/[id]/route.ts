import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAutoPlanStatusForSaleDate,
  getDefaultSaleTime,
  getDaysUntilSaleDate,
} from '@/lib/date'
import { deleteMockPlan, isMockDataMode, updateMockPlan } from '@/lib/mock-data'
import { parsePlanUpdateInput } from '@/lib/plan-validation'
import { cancelPlanReminderTasks, syncPlanReminderTasks } from '@/lib/reminder-task'
import type { PlanStatus, TravelPlan as PrismaPlan } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

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

// POST /api/plans/:id → 更新
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = parsePlanUpdateInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const input = parsed.data
  const saleDate =
    input.saleDate ??
    (input.departureDate ? getDefaultSaleTime(input.departureDate) : undefined)

  if (isMockDataMode()) {
    const plan = updateMockPlan(id, {
      ...(input.departureDate && {
        departureDate: input.departureDate.toISOString().slice(0, 10),
      }),
      ...(saleDate && { saleDate: saleDate.toISOString() }),
      ...(input.additionalSaleDates && {
        additionalSaleDates: input.additionalSaleDates.map((date) => date.toISOString()),
      }),
      ...('holidayName' in input && { holidayName: input.holidayName }),
      ...(input.fromStation && { fromStation: input.fromStation }),
      ...(input.toStation && { toStation: input.toStation }),
      ...(input.seatType && { seatType: input.seatType }),
      ...(input.ticketCount !== undefined && { ticketCount: input.ticketCount }),
      ...('remark' in input && { remark: input.remark }),
    })

    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data: withSaleInfo(plan) })
  }

  const plan = await prisma.$transaction(async (tx) => {
    const updatedPlan = await tx.travelPlan.update({
      where: { id },
      data: {
        ...(input.departureDate && { departureDate: input.departureDate }),
        ...(saleDate && { saleDate }),
        ...(input.additionalSaleDates && {
          additionalSaleDates: input.additionalSaleDates,
        }),
        ...('holidayName' in input && { holidayName: input.holidayName }),
        ...(input.fromStation && { fromStation: input.fromStation }),
        ...(input.toStation && { toStation: input.toStation }),
        ...(input.seatType && { seatType: input.seatType }),
        ...(input.ticketCount !== undefined && { ticketCount: input.ticketCount }),
        ...('remark' in input && { remark: input.remark }),
      },
    })

    const status = getAutoPlanStatusForSaleDate(updatedPlan.saleDate) as PlanStatus
    const savedPlan =
      updatedPlan.status === status
        ? updatedPlan
        : await tx.travelPlan.update({
            where: { id },
            data: { status },
          })

    await syncPlanReminderTasks(tx, savedPlan)
    return savedPlan
  })

  return NextResponse.json({ data: withSaleInfo(plan) })
}

// DELETE /api/plans/:id → 删除
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  if (isMockDataMode()) {
    deleteMockPlan(id)
    return new NextResponse(null, { status: 204 })
  }

  await prisma.$transaction(async (tx) => {
    await cancelPlanReminderTasks(tx, id)
    await tx.travelPlan.delete({ where: { id } })
  })
  return new NextResponse(null, { status: 204 })
}
