/**
 * MV3 Service Worker：在扩展上下文中请求助手 API，避免在 12306 HTTPS 页面里
 * 直接 fetch HTTP 触发 Mixed Content 拦截。
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'SYNC_WAITLIST') return false

  const { serverUrl, syncToken, orders } = message
  const base = String(serverUrl ?? '').replace(/\/$/, '')
  const url = `${base}/api/waitlist/sync`

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-token': syncToken ?? '',
    },
    body: JSON.stringify({ orders }),
  })
    .then(async (res) => {
      const text = await res.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        /* 非 JSON 时仅带回 text */
      }
      sendResponse({ ok: res.ok, status: res.status, json, text })
    })
    .catch((err) => {
      sendResponse({
        ok: false,
        status: 0,
        error: err?.message ?? String(err),
      })
    })

  return true
})
