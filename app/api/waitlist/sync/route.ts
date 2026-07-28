import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasValidSyncToken } from '@/lib/api-auth'
import { mergeExtensionCors, optionsExtensionCors } from '@/lib/extension-cors'
import { isMockDataMode, replaceMockWaitlistOrders } from '@/lib/mock-data'
import { syncWaitlistReminderTasks } from '@/lib/reminder-task'
import { normalizeWaitlistOrders } from '@/lib/waitlist-validation'

export function OPTIONS() {
  return optionsExtensionCors()
}

export async function POST(request: NextRequest) {
  if (!isMockDataMode() && !hasValidSyncToken(request)) {
    return mergeExtensionCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const body = await request.json().catch(() => null)
  const parsed = normalizeWaitlistOrders(body)
  if (!parsed.ok) {
    return mergeExtensionCors(
      NextResponse.json({ error: parsed.error }, { status: 400 })
    )
  }
  const orders = parsed.orders

  if (isMockDataMode()) {
    const count = replaceMockWaitlistOrders(orders)
    return mergeExtensionCors(NextResponse.json({ success: true, count }))
  }

  await prisma.$transaction(async (tx) => {
    await tx.waitlistOrder.deleteMany({})

    if (orders.length > 0) {
      await tx.waitlistOrder.createMany({
        data: orders,
      })
    }

    await syncWaitlistReminderTasks(tx, orders)
  })

  return mergeExtensionCors(NextResponse.json({ success: true, count: orders.length }))
}
