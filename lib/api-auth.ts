import { timingSafeEqual } from 'node:crypto'

export function hasValidSyncToken(request: Request): boolean {
  const expected = process.env.EXTENSION_SYNC_TOKEN?.trim()
  const received = request.headers.get('x-sync-token')?.trim()
  if (!expected || !received) return false

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}
