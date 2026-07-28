import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  sendWeComMessage: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/mock-data', () => ({
  isMockDataMode: () => false,
  replaceMockWaitlistOrders: vi.fn(),
}))

vi.mock('@/lib/notify', () => ({
  isWeComRelayConfigured: () => true,
  sendWeComMessage: mocks.sendWeComMessage,
}))

import { POST as syncWaitlist } from '@/app/api/waitlist/sync/route'
import { POST as testNotification } from '@/app/api/notify/test/route'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('protected API routes', () => {
  it('does not send a test notification without X-Sync-Token', async () => {
    vi.stubEnv('EXTENSION_SYNC_TOKEN', 'expected-token')
    const request = new NextRequest('http://localhost/api/notify/test', {
      method: 'POST',
    })

    const response = await testNotification(request)

    expect(response.status).toBe(401)
    expect(mocks.sendWeComMessage).not.toHaveBeenCalled()
  })

  it('does not start the replacement transaction for invalid sync data', async () => {
    vi.stubEnv('EXTENSION_SYNC_TOKEN', 'expected-token')
    const request = new NextRequest('http://localhost/api/waitlist/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Token': 'expected-token',
      },
      body: JSON.stringify({
        orders: [{ orderNo: 'E123', departureDate: 'invalid' }],
      }),
    })

    const response = await syncWaitlist(request)

    expect(response.status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
