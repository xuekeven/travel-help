import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildNeedSegmentsForOrder } from '@/lib/waitlist-need-segments'
import { getMockStore, isMockDataMode } from '@/lib/mock-data'
import type { WaitlistGroup, WaitlistOrder } from '@/types'

type SortBy = 'departureTime' | 'price'
type SortDir = 'asc' | 'desc'

function normalizeSortBy(value: string | null): SortBy {
  return value === 'price' ? 'price' : 'departureTime'
}

function normalizeSortDir(value: string | null): SortDir {
  return value === 'desc' ? 'desc' : 'asc'
}

function compareWaitlistOrders(a: WaitlistOrder, b: WaitlistOrder, sortBy: SortBy, sortDir: SortDir): number {
  const direction = sortDir === 'asc' ? 1 : -1

  if (sortBy === 'price') {
    return (
      (Number(a.price) - Number(b.price)) * direction ||
      a.departureTime.localeCompare(b.departureTime) ||
      a.orderNo.localeCompare(b.orderNo)
    )
  }

  return (
    a.departureTime.localeCompare(b.departureTime) * direction ||
    (Number(a.price) - Number(b.price)) ||
    a.orderNo.localeCompare(b.orderNo)
  )
}

function compareWaitlistGroups(a: WaitlistGroup, b: WaitlistGroup, sortBy: SortBy, sortDir: SortDir): number {
  const direction = sortDir === 'asc' ? 1 : -1
  const firstA = a.orders[0]
  const firstB = b.orders[0]

  if (sortBy === 'price') {
    return (
      (Number(firstA?.price ?? 0) - Number(firstB?.price ?? 0)) * direction ||
      a.departureDate.localeCompare(b.departureDate) ||
      a.fromStation.localeCompare(b.fromStation, 'zh-Hans-CN') ||
      a.toStation.localeCompare(b.toStation, 'zh-Hans-CN')
    )
  }

  return (
    a.departureDate.localeCompare(b.departureDate) * direction ||
    (firstA?.departureTime ?? '').localeCompare(firstB?.departureTime ?? '') * direction ||
    a.fromStation.localeCompare(b.fromStation, 'zh-Hans-CN') ||
    a.toStation.localeCompare(b.toStation, 'zh-Hans-CN')
  )
}

export async function GET(request: NextRequest) {
  const sortBy = normalizeSortBy(request.nextUrl.searchParams.get('sortBy'))
  const sortDir = normalizeSortDir(request.nextUrl.searchParams.get('sortDir'))

  const orders = isMockDataMode()
    ? [...getMockStore().waitlistOrders]
    : await prisma.waitlistOrder.findMany()

  const groupMap = new Map<string, WaitlistGroup>()
  for (const order of orders) {
    const dateStr = order.departureDate.toISOString().slice(0, 10)
    const key = `${dateStr}|${order.fromStation}|${order.toStation}`

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        departureDate: dateStr,
        fromStation: order.fromStation,
        toStation: order.toStation,
        orders: [],
      })
    }

    groupMap.get(key)!.orders.push({
      id: order.id,
      orderNo: order.orderNo,
      departureDate: dateStr,
      fromStation: order.fromStation,
      toStation: order.toStation,
      trainNumbers: order.trainNumbers,
      seatType: order.seatType,
      ticketCount: order.ticketCount,
      price: Number(order.price),
      departureTime: order.departureTime,
      arrivalTime: order.arrivalTime,
      status: order.status,
      syncedAt: order.syncedAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      needSegments: buildNeedSegmentsForOrder({
        rawData: order.rawData,
        trainNumbers: order.trainNumbers,
        fromStation: order.fromStation,
        toStation: order.toStation,
        departureTime: order.departureTime,
        arrivalTime: order.arrivalTime,
        seatType: order.seatType,
      }),
    })
  }

  const groups = Array.from(groupMap.values())

  for (const group of groups) {
    group.orders.sort((a, b) => compareWaitlistOrders(a, b, sortBy, sortDir))
  }

  groups.sort((a, b) => compareWaitlistGroups(a, b, sortBy, sortDir))

  return NextResponse.json({ data: groups })
}
