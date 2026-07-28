import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAutoPlanStatusForSaleDate,
  getDefaultSaleTime,
  getDaysUntilSaleDate,
} from '@/lib/date'
import { deleteMockPlan, isMockDataMode, updateMockPlan } from '@/lib/mock-data'
import { syncPlanReminderTasks } from '@/lib/plan-reminder'
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
  const body = await request.json()
  const departureDate = body.departureDate ? new Date(body.departureDate) : undefined
  const saleDate = body.saleDate
    ? new Date(body.saleDate)
    : departureDate
      ? getDefaultSaleTime(departureDate)
      : undefined
  const additionalSaleDates = Array.isArray(body.additionalSaleDates)
    ? body.additionalSaleDates.map((value: string) => new Date(value))
    : undefined

  if (isMockDataMode()) {
    const plan = updateMockPlan(id, {
      ...(body.departureDate && { departureDate: body.departureDate }),
      ...(saleDate && { saleDate: body.saleDate ?? saleDate.toISOString() }),
      ...(additionalSaleDates && { additionalSaleDates: body.additionalSaleDates }),
      ...(body.holidayName !== undefined && { holidayName: body.holidayName || null }),
      ...(body.fromStation && { fromStation: body.fromStation }),
      ...(body.toStation && { toStation: body.toStation }),
      ...(body.seatType && { seatType: body.seatType }),
      ...(body.ticketCount !== undefined && { ticketCount: body.ticketCount }),
      ...(body.remark !== undefined && { remark: body.remark || null }),
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
        ...(departureDate && { departureDate }),
        ...(saleDate && { saleDate }),
        ...(additionalSaleDates && { additionalSaleDates }),
        ...(body.holidayName !== undefined && { holidayName: body.holidayName || null }),
        ...(body.fromStation && { fromStation: body.fromStation }),
        ...(body.toStation && { toStation: body.toStation }),
        ...(body.seatType && { seatType: body.seatType }),
        ...(body.ticketCount !== undefined && { ticketCount: body.ticketCount }),
        ...(body.remark !== undefined && { remark: body.remark || null }),
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

    await syncPlanReminderTasks(tx, savedPlan.id, savedPlan)
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

  await prisma.travelPlan.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
