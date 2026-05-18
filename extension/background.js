/**
 * MV3 Service Worker：在扩展上下文中请求助手 API，避免：
 * - 12306 HTTPS 页面里直接 fetch HTTP（Mixed Content）
 * - 选项页直接 fetch 自家 HTTPS 时的 CORS / 预检差异（Failed to fetch）
 */

function postJson(url, syncToken, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-token': syncToken ?? '',
    },
    body: body == null ? undefined : JSON.stringify(body),
  })
}

function sendJsonResponse(sendResponse, res) {
  return res
    .then(async (r) => {
      const text = await r.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        /* 非 JSON */
      }
      sendResponse({ ok: r.ok, status: r.status, json, text })
    })
    .catch((err) => {
      sendResponse({
        ok: false,
        status: 0,
        error: err?.message ?? String(err),
      })
    })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TEST_NOTIFY') {
    const { serverUrl, syncToken } = message
    const base = String(serverUrl ?? '').replace(/\/$/, '')
    const url = `${base}/api/notify/test`
    sendJsonResponse(sendResponse, postJson(url, syncToken, {}))
    return true
  }

  if (message?.type === 'SYNC_WAITLIST') {
    const { serverUrl, syncToken, orders } = message
    const base = String(serverUrl ?? '').replace(/\/$/, '')
    const url = `${base}/api/waitlist/sync`
    sendJsonResponse(sendResponse, postJson(url, syncToken, { orders }))
    return true
  }

  return false
})
