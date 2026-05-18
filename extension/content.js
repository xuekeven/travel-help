/**
 * 12306 买票助手 · Content Script（Isolated World）
 *
 * 监听 injected.js（main world）通过 postMessage 传来的候补订单数据，
 * 使用 chrome.storage.sync 读取配置后同步到助手服务。
 */

window.addEventListener('message', async (event) => {
  if (event.source !== window) return
  if (event.data?.source !== '12306_HELPER') return
  if (event.data?.type !== 'ORDERS_DATA') return

  const rawOrders = extractOrders(event.data.payload)
  if (rawOrders.length === 0) {
    console.log('[12306助手] 候补订单列表为空')
    return
  }

  const orders = rawOrders.map(parseOrder)
  console.log(`[12306助手] 检测到 ${orders.length} 条候补订单，准备同步...`, orders)
  await syncOrders(orders)
})

function extractOrders(json) {
  const list = json?.data?.list
  if (Array.isArray(list)) return list
  for (const fb of [json?.data?.pageBean?.data, json?.data?.data]) {
    if (Array.isArray(fb) && fb.length > 0) return fb
  }
  return []
}

function parseOrder(raw) {
  const needs = raw.needs ?? []
  const firstNeed = needs[0] ?? {}
  const trainNumbers = [...new Set(needs.map((n) => n.board_train_code).filter(Boolean))]
  const toStation = [...new Set(needs.map((n) => n.to_station_name).filter(Boolean))].join('/')

  return {
    orderNo:       raw.reserve_no,
    departureDate: firstNeed.train_date ?? '',
    fromStation:   firstNeed.from_station_name ?? '',
    toStation,
    trainNumbers,
    seatType:      firstNeed.seat_name ?? '',
    ticketCount:   (raw.passengers ?? []).length || 1,
    price:         parseFloat(raw.prepay_amount ?? 0),
    departureTime: firstNeed.start_time ?? '',
    arrivalTime:   firstNeed.arrive_time ?? '',
    status:        raw.status_name ?? '',
    rawData:       raw,
  }
}

async function syncOrders(orders) {
  const { serverUrl, syncToken } = await chrome.storage.sync.get(['serverUrl', 'syncToken'])

  if (!serverUrl) {
    console.warn('[12306助手] 未配置服务器地址，请在插件设置页填写')
    return
  }

  const base = serverUrl.replace(/\/$/, '')
  try {
    // 必须通过 background 发起请求：12306 为 HTTPS，在页面上下文中 fetch HTTP 会被 Mixed Content 拦截
    const res = await chrome.runtime.sendMessage({
      type: 'SYNC_WAITLIST',
      serverUrl: base,
      syncToken,
      orders,
    })

    if (chrome.runtime.lastError) {
      console.error('[12306助手] ❌', chrome.runtime.lastError.message)
      return
    }

    if (res?.error) {
      console.error('[12306助手] ❌ 请求异常（服务器是否在线？）：', res.error)
      return
    }

    if (res?.ok && res.json != null) {
      console.log(`[12306助手] ✅ 已同步 ${res.json.count} 条候补订单到 ${base}`)
    } else if (res?.status === 401) {
      console.error('[12306助手] ❌ Token 验证失败，请检查设置页的 Token')
    } else {
      console.error(`[12306助手] ❌ 同步失败，服务器返回 ${res?.status ?? '?'}`)
    }
  } catch (err) {
    console.error('[12306助手] ❌ 请求异常（服务器是否在线？）：', err.message)
  }
}

console.log('[12306助手] Content script 已就绪，等待候补订单数据...')
