import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendWeComMessage } from '@/lib/notify'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('sendWeComMessage', () => {
  it('passes an idempotency key without logging message content', async () => {
    vi.stubEnv('WEWORK_RELAY_BASE_URL', 'https://relay.example.com')
    vi.stubEnv('WEWORK_RELAY_API_KEY', 'secret')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errcode: 0, errmsg: 'ok' }), {
        status: 200,
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(
      sendWeComMessage('敏感通知内容', { idempotencyKey: 'reminder-1' })
    ).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.example.com/wework/send/message',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': 'reminder-1',
        }),
      })
    )
    expect(log.mock.calls.flat().join(' ')).not.toContain('敏感通知内容')
  })

  it('aborts a slow relay request after the configured timeout', async () => {
    vi.stubEnv('WEWORK_RELAY_BASE_URL', 'https://relay.example.com')
    vi.stubEnv('WEWORK_RELAY_API_KEY', 'secret')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string | URL | Request, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(init.signal?.reason),
            { once: true }
          )
        })
      })
    )

    await expect(
      sendWeComMessage('timeout', { timeoutMs: 5 })
    ).rejects.toBeDefined()
  })
})
