/**
 * 企微文本通知：经 Tailnet 内 wework-send 中转，不直连企微 API。
 * @see docs/6.企微通知.md
 */

export function isWeComRelayConfigured(): boolean {
  return Boolean(
    process.env.WEWORK_RELAY_BASE_URL?.trim() &&
      process.env.WEWORK_RELAY_API_KEY?.trim()
  )
}

export async function sendWeComMessage(content: string): Promise<void> {
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  const baseUrl = process.env.WEWORK_RELAY_BASE_URL?.trim().replace(/\/$/, '')
  const apiKey = process.env.WEWORK_RELAY_API_KEY?.trim()
  const touser = process.env.WECOM_TO_USER?.trim()

  console.log(`[企微通知] ${timestamp}`)
  console.log(`  内容：${content}`)

  if (!baseUrl || !apiKey) {
    console.warn(
      '[企微通知] 未配置 WEWORK_RELAY_BASE_URL / WEWORK_RELAY_API_KEY，跳过发送（仅控制台）'
    )
    return
  }

  const body: { content: string; touser?: string } = { content }
  if (touser) body.touser = touser

  const url = `${baseUrl}/wework/send/message`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json: { errcode?: number; errmsg?: string } | null = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON */
  }

  if (!res.ok) {
    throw new Error(
      `wework-send 请求失败 HTTP ${res.status}: ${json?.errmsg ?? (text || res.statusText)}`
    )
  }

  if (json != null && json.errcode !== 0) {
    throw new Error(`企微返回 errcode=${json.errcode}: ${json.errmsg ?? 'unknown'}`)
  }
}
