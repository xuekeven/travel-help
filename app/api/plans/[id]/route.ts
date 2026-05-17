import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSaleDate, getDaysUntilSale } from '@/lib/date'
import type { TravelPlan as PrismaPlan } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

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

// POST /api/plans/:id → 更新
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  const plan = await prisma.travelPlan.update({
    where: { id },
    data: {
      ...(body.departureDate && { departureDate: new Date(body.departureDate) }),
      ...(body.holidayName !== undefined && { holidayName: body.holidayName || null }),
      ...(body.fromStation && { fromStation: body.fromStation }),
      ...(body.toStation && { toStation: body.toStation }),
      ...(body.seatType && { seatType: body.seatType }),
      ...(body.ticketCount !== undefined && { ticketCount: body.ticketCount }),
      ...(body.status && { status: body.status }),
      ...(body.remark !== undefined && { remark: body.remark || null }),
    },
  })
  return NextResponse.json({ data: withSaleInfo(plan) })
}

// DELETE /api/plans/:id → 删除
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.travelPlan.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
