import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasValidSyncToken } from '@/lib/api-auth'
import { isWeComRelayConfigured, sendWeComMessage } from '@/lib/notify'
import { mergeExtensionCors, optionsExtensionCors } from '@/lib/extension-cors'
import { isMockDataMode } from '@/lib/mock-data'

export function OPTIONS() {
  return optionsExtensionCors()
}

export async function POST(request: NextRequest) {
  if (!isMockDataMode() && !hasValidSyncToken(request)) {
    return mergeExtensionCors(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  try {
    await sendWeComMessage('这是一条来自 12306 买票助手的测试通知，服务运行正常', {
      idempotencyKey: `test:${randomUUID()}`,
    })
    const relayOn = isWeComRelayConfigured()
    return mergeExtensionCors(
      NextResponse.json({
        success: true,
        relay: relayOn,
        message: relayOn
          ? '通知已通过 wework-send 发送，请在企业微信中查看'
          : '未配置企微中转，内容已打印到服务器控制台',
      })
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[企微通知] 测试发送失败：', message)
    return mergeExtensionCors(
      NextResponse.json({ success: false, error: message }, { status: 502 })
    )
  }
}
