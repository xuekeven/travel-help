/**
 * 12306 买票助手 · Content Script（Isolated World）
 *
 * 监听 injected.js（main world）通过 postMessage 传来的候补订单/出行订单数据，
 * 使用 chrome.storage.sync 读取配置后同步到助手服务，并在页面右上角展示实时状态。
 */

const LOG_LIMIT = 200
const PILL_WIDTH = 100
const STATUS = {
  INIT: {
    key: 'init',
    label: '初始化中',
    detail: '正在接入页面',
    tone: '#64748b',
  },
  READY: {
    key: 'ready',
    label: '已就绪',
    detail: '等待订单数据',
    tone: '#1677ff',
  },
  SYNCING: {
    key: 'syncing',
    label: '同步中',
    detail: '正在同步订单',
    tone: '#0ea5e9',
  },
  EMPTY: {
    key: 'empty',
    label: '无数据',
    detail: '订单列表为空',
    tone: '#8b5cf6',
  },
  SUCCESS: {
    key: 'success',
    label: '已同步',
    detail: '订单已同步',
    tone: '#16a34a',
  },
  WARNING: {
    key: 'warning',
    label: '需配置',
    detail: '请填写服务器地址',
    tone: '#f59e0b',
  },
  ERROR: {
    key: 'error',
    label: '异常',
    detail: '同步失败',
    tone: '#dc2626',
  },
}

const state = {
  enabled: false,
  started: false,
  logs: [],
  status: STATUS.INIT,
  panelOpen: false,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  ui: null,
  position: {
    left: null,
    top: 130,
    right: 100,
  },
}

chrome.storage.sync.get(['enabled'], (result) => {
  if (result.enabled === true) {
    startHelper()
  } else {
    console.log('[12306助手] 插件未启用，跳过页面功能')
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes.enabled) return
  if (changes.enabled.newValue === true) {
    startHelper()
  } else {
    stopHelper()
  }
})

function startHelper() {
  if (state.started) return
  state.enabled = true
  state.started = true
  window.addEventListener('message', handleHelperMessage)
  mountWhenReady()
  setStatus(STATUS.INIT)
  addLog('info', 'Content script 已就绪，等待订单数据...', STATUS.READY)
  enablePageInterceptors()
}

function stopHelper() {
  state.enabled = false
  state.started = false
  window.removeEventListener('message', handleHelperMessage)
  unmountUi()
  console.log('[12306助手] 插件已停用，停止处理页面数据')
}

function enablePageInterceptors() {
  window.postMessage({ source: '12306_HELPER_CONTROL', type: 'ENABLE_INTERCEPTORS' }, '*')
}

async function handleHelperMessage(event) {
  if (!state.enabled) return
  if (event.source !== window) return
  if (event.data?.source !== '12306_HELPER') return

  if (event.data?.type === 'HELPER_LOG') {
    const payload = event.data.payload ?? {}
    addLog(payload.level ?? 'info', payload.message ?? '收到页面脚本消息', statusFromKey(payload.status))
    return
  }

  if (event.data?.type === 'TRAVEL_ORDERS_DATA') {
    const travelOrders = extractTravelOrders(event.data.payload)
    if (travelOrders.length === 0) {
      addLog('info', '未出行订单列表为空', STATUS.EMPTY)
      console.log('[12306助手] 未出行订单列表为空')
      await syncTravelOrders([])
      return
    }

    const filtered = filterEffectiveTravelOrders(travelOrders)
    const summary = formatTravelOrderFilterSummary(filtered)
    addLog('info', `${summary}，准备同步...`, STATUS.SYNCING)
    console.log(`[12306助手] ${summary}，准备同步...`, filtered.effectiveOrders)
    await syncTravelOrders(filtered.effectiveOrders)
    return
  }

  if (event.data?.type !== 'WAITLIST_ORDERS_DATA' && event.data?.type !== 'ORDERS_DATA') return

  const rawOrders = extractOrders(event.data.payload)
  if (rawOrders.length === 0) {
    addLog('info', '候补订单列表为空', STATUS.EMPTY)
    console.log('[12306助手] 候补订单列表为空')
    await syncOrders([])
    return
  }

  const orders = rawOrders.map(parseOrder)
  addLog('info', `检测到 ${orders.length} 条候补订单，准备同步...`, STATUS.SYNCING)
  console.log(`[12306助手] 检测到 ${orders.length} 条候补订单，准备同步...`, orders)
  await syncOrders(orders)
}

function statusFromKey(key) {
  if (!key) return null
  return Object.values(STATUS).find((item) => item.key === key) ?? null
}

function mountWhenReady() {
  if (document.documentElement) {
    mountUi()
    return
  }
  document.addEventListener('DOMContentLoaded', mountUi, { once: true })
}

function mountUi() {
  if (state.ui) return

  const host = document.createElement('div')
  host.id = '12306-helper-status-root'
  host.style.position = 'fixed'
  host.style.top = `${state.position.top}px`
  host.style.left = `${getInitialLeft()}px`
  host.style.right = 'auto'
  host.style.zIndex = '2147483647'
  host.style.width = 'auto'
  host.style.height = 'auto'
  host.style.pointerEvents = 'auto'

  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      :host {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      .wrap {
        position: relative;
      }
      .pill {
        width: ${PILL_WIDTH}px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 10px;
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 6px;
        background: linear-gradient(135deg, rgba(17, 84, 200, 0.96), rgba(18, 168, 216, 0.96));
        box-shadow: 0 10px 28px rgba(15, 43, 92, 0.22);
        color: #fff;
        cursor: pointer;
        user-select: none;
      }
      .dot {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--tone);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.24);
      }
      .meta {
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }
      .label {
        display: block;
        overflow: hidden;
        font-size: 15px;
        font-weight: 700;
        line-height: 1;
        text-align: center;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .panel {
        position: absolute;
        top: 44px;
        right: 0;
        width: 320px;
        height: 400px;
        display: none;
        overflow: hidden;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
      }
      .panel.open {
        display: flex;
        flex-direction: column;
      }
      .panelHead {
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        border-bottom: 1px solid #e5e7eb;
        background: #f8fafc;
      }
      .title {
        color: #0f172a;
        font-size: 13px;
        font-weight: 700;
      }
      .count {
        color: #64748b;
        font-size: 11px;
      }
      .logs {
        flex: 1;
        overflow-y: auto;
        padding: 10px 10px 12px;
        background: #ffffff;
      }
      .log {
        display: grid;
        grid-template-columns: 66px minmax(0, 1fr);
        gap: 4px;
        padding: 7px 0;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        line-height: 1.35;
      }
      .log:last-child {
        border-bottom: 0;
      }
      .time {
        color: #64748b;
        white-space: nowrap;
      }
      .message {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .log.error .message {
        color: #dc2626;
      }
      .log.warn .message {
        color: #b45309;
      }
      .empty {
        padding: 26px 12px;
        color: #64748b;
        text-align: center;
        font-size: 12px;
      }
    </style>
    <div class="wrap">
      <button class="pill" type="button" aria-label="12306 助手状态">
        <span class="dot"></span>
        <span class="meta">
          <span class="label"></span>
        </span>
      </button>
      <section class="panel" aria-label="12306 助手日志">
        <header class="panelHead">
          <span class="title">运行记录</span>
          <span class="count"></span>
        </header>
        <div class="logs"></div>
      </section>
    </div>
  `

  const target = document.body || document.documentElement
  target.appendChild(host)

  state.ui = {
    host,
    pill: shadow.querySelector('.pill'),
    dot: shadow.querySelector('.dot'),
    label: shadow.querySelector('.label'),
    panel: shadow.querySelector('.panel'),
    count: shadow.querySelector('.count'),
    logs: shadow.querySelector('.logs'),
  }

  bindDragAndClick()

  renderUi()
}

function unmountUi() {
  if (!state.ui) return
  state.ui.host.remove()
  state.ui = null
  state.panelOpen = false
  state.dragging = false
}

function bindDragAndClick() {
  const pill = state.ui.pill
  let startX = 0
  let startY = 0
  let moved = false

  const onMove = (event) => {
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (!moved && Math.hypot(dx, dy) > 4) {
      moved = true
      state.dragging = true
      pill.setAttribute('data-dragging', 'true')
    }

    if (!state.dragging) return

    const width = state.ui.host.offsetWidth || 178
    const height = state.ui.host.offsetHeight || 36
    const nextLeft = clamp(event.clientX - state.dragOffsetX, 8, window.innerWidth - width - 8)
    const nextTop = clamp(event.clientY - state.dragOffsetY, 8, window.innerHeight - height - 8)
    state.position.left = nextLeft
    state.position.top = nextTop
    state.position.right = null
    applyPosition()
  }

  const stop = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
    pill.removeAttribute('data-dragging')
    const wasDragging = state.dragging
    state.dragging = false

    if (!wasDragging && !moved) {
      state.panelOpen = !state.panelOpen
      renderUi()
    }
  }

  pill.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    const rect = state.ui.host.getBoundingClientRect()
    startX = event.clientX
    startY = event.clientY
    moved = false
    state.dragging = false
    state.dragOffsetX = event.clientX - rect.left
    state.dragOffsetY = event.clientY - rect.top
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  })
}

function setStatus(status) {
  if (!status) return
  state.status = status
  renderUi()
}

function addLog(level, message, nextStatus) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
    time: formatLogTime(new Date()),
    message: `[12306助手] ${message}`,
  }

  state.logs.push(entry)
  if (state.logs.length > LOG_LIMIT) {
    state.logs.splice(0, state.logs.length - LOG_LIMIT)
  }

  if (nextStatus) setStatus(nextStatus)
  renderUi(true)
}

function renderUi(scrollToBottom = false) {
  if (!state.ui) return

  state.ui.host.style.setProperty('--tone', state.status.tone)
  state.ui.label.textContent = state.status.label
  state.ui.panel.classList.toggle('open', state.panelOpen)
  state.ui.count.textContent = `${state.logs.length} 条`
  applyPosition()

  if (state.logs.length === 0) {
    state.ui.logs.innerHTML = '<div class="empty">暂无记录</div>'
  } else {
    state.ui.logs.replaceChildren(...state.logs.map(createLogNode))
  }

  if (scrollToBottom || state.panelOpen) {
    state.ui.logs.scrollTop = state.ui.logs.scrollHeight
  }
}

function createLogNode(entry) {
  const row = document.createElement('div')
  row.className = `log ${entry.level}`

  const time = document.createElement('span')
  time.className = 'time'
  time.textContent = entry.time

  const message = document.createElement('span')
  message.className = 'message'
  message.textContent = entry.message

  row.append(time, message)
  return row
}

function formatLogTime(date) {
  const pad = (value, len = 2) => String(value).padStart(len, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function getInitialLeft() {
  const width = PILL_WIDTH
  return Math.max(8, window.innerWidth - width - 16)
}

function applyPosition() {
  if (!state.ui) return
  const host = state.ui.host
  if (state.position.left != null) {
    host.style.left = `${state.position.left}px`
    host.style.right = 'auto'
  } else if (state.position.right != null) {
    host.style.right = `${state.position.right}px`
    host.style.left = 'auto'
  }
  host.style.top = `${state.position.top}px`
}

function clamp(value, min, max) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function extractOrders(json) {
  const list = json?.data?.list
  if (Array.isArray(list)) return list
  for (const fb of [json?.data?.pageBean?.data, json?.data?.data]) {
    if (Array.isArray(fb) && fb.length > 0) return fb
  }
  return []
}

function extractTravelOrders(json) {
  const list = json?.data?.OrderDTODataList ?? json?.data?.data?.OrderDTODataList
  if (Array.isArray(list)) return list
  return []
}

function filterEffectiveTravelOrders(orders) {
  const stats = {
    total: orders.length,
    refunded: 0,
    changed: 0,
    exited: 0,
    effectiveOrders: [],
  }

  for (const order of orders) {
    const invalidReason = classifyInvalidTravelOrder(order)
    if (invalidReason === 'refunded') {
      stats.refunded += 1
      continue
    }
    if (invalidReason === 'changed') {
      stats.changed += 1
      continue
    }
    if (invalidReason === 'exited') {
      stats.exited += 1
      continue
    }

    stats.effectiveOrders.push(order)
  }

  return stats
}

function classifyInvalidTravelOrder(order) {
  const text = collectTravelOrderStatusText(order)
  if (/(已退票|退票成功|退票)/.test(text)) return 'refunded'
  if (/(已改签|改签成功)/.test(text)) return 'changed'
  if (/(已出站|出站)/.test(text)) return 'exited'
  return null
}

function collectTravelOrderStatusText(order) {
  const tickets = Array.isArray(order?.tickets) ? order.tickets : []
  const values = [
    order?.ticket_status_name_page,
    order?.status_name,
    order?.order_status_name,
    order?.order_status,
    order?.ticket_status_name,
    order?.cancel_flag === 'Y' ? '已退票' : '',
    ...tickets.flatMap((ticket) => [
      ticket?.ticket_status_name,
      ticket?.ticket_status_name_page,
      ticket?.status_name,
      ticket?.order_status_name,
      ticket?.ticket_status,
    ]),
  ]

  return values
    .filter((value) => value != null)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join('|')
}

function formatTravelOrderFilterSummary(stats) {
  const parts = [`检测到 ${stats.total} 条出行订单`]
  if (stats.refunded > 0) parts.push(`其中 ${stats.refunded} 条已退票订单`)
  if (stats.changed > 0) parts.push(`${stats.changed} 条已改签订单`)
  if (stats.exited > 0) parts.push(`${stats.exited} 条已出站订单`)
  parts.push(`${stats.effectiveOrders.length} 条有效订单`)
  return parts.join('，')
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
    addLog('warn', '未配置服务器地址，请在插件设置页填写', STATUS.WARNING)
    console.warn('[12306助手] 未配置服务器地址，请在插件设置页填写')
    return
  }

  const base = serverUrl.replace(/\/$/, '')
  setStatus(STATUS.SYNCING)
  try {
    // 必须通过 background 发起请求：12306 为 HTTPS，在页面上下文中 fetch HTTP 会被 Mixed Content 拦截
    const res = await chrome.runtime.sendMessage({
      type: 'SYNC_WAITLIST',
      serverUrl: base,
      syncToken,
      orders,
    })

    if (chrome.runtime.lastError) {
      addLog('error', chrome.runtime.lastError.message, STATUS.ERROR)
      console.error('[12306助手] ❌', chrome.runtime.lastError.message)
      return
    }

    if (res?.error) {
      addLog('error', `请求异常（服务器是否在线？）：${res.error}`, STATUS.ERROR)
      console.error('[12306助手] ❌ 请求异常（服务器是否在线？）：', res.error)
      return
    }

    if (res?.ok && res.json != null) {
      addLog('info', `已同步 ${res.json.count} 条候补订单到 ${base}`, STATUS.SUCCESS)
      console.log(`[12306助手] ✅ 已同步 ${res.json.count} 条候补订单到 ${base}`)
    } else if (res?.status === 401) {
      addLog('error', 'Token 验证失败，请检查设置页的 Token', STATUS.ERROR)
      console.error('[12306助手] ❌ Token 验证失败，请检查设置页的 Token')
    } else {
      addLog('error', `同步失败，服务器返回 ${res?.status ?? '?'}`, STATUS.ERROR)
      console.error(`[12306助手] ❌ 同步失败，服务器返回 ${res?.status ?? '?'}`)
    }
  } catch (err) {
    addLog('error', `请求异常（服务器是否在线？）：${err.message}`, STATUS.ERROR)
    console.error('[12306助手] ❌ 请求异常（服务器是否在线？）：', err.message)
  }
}

async function syncTravelOrders(orders) {
  const { serverUrl, syncToken } = await chrome.storage.sync.get(['serverUrl', 'syncToken'])

  if (!serverUrl) {
    addLog('warn', '未配置服务器地址，请在插件设置页填写', STATUS.WARNING)
    console.warn('[12306助手] 未配置服务器地址，请在插件设置页填写')
    return
  }

  const base = serverUrl.replace(/\/$/, '')
  setStatus(STATUS.SYNCING)
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'SYNC_TRAVEL_ORDERS',
      serverUrl: base,
      syncToken,
      orders,
    })

    if (chrome.runtime.lastError) {
      addLog('error', chrome.runtime.lastError.message, STATUS.ERROR)
      console.error('[12306助手] ❌', chrome.runtime.lastError.message)
      return
    }

    if (res?.error) {
      addLog('error', `请求异常（服务器是否在线？）：${res.error}`, STATUS.ERROR)
      console.error('[12306助手] ❌ 请求异常（服务器是否在线？）：', res.error)
      return
    }

    if (res?.ok && res.json != null) {
      addLog('info', `已同步 ${res.json.count} 条出行订单到 ${base}`, STATUS.SUCCESS)
      console.log(`[12306助手] ✅ 已同步 ${res.json.count} 条出行订单到 ${base}`)
    } else if (res?.status === 401) {
      addLog('error', 'Token 验证失败，请检查设置页的 Token', STATUS.ERROR)
      console.error('[12306助手] ❌ Token 验证失败，请检查设置页的 Token')
    } else {
      addLog('error', `同步失败，服务器返回 ${res?.status ?? '?'}`, STATUS.ERROR)
      console.error(`[12306助手] ❌ 同步失败，服务器返回 ${res?.status ?? '?'}`)
    }
  } catch (err) {
    addLog('error', `请求异常（服务器是否在线？）：${err.message}`, STATUS.ERROR)
    console.error('[12306助手] ❌ 请求异常（服务器是否在线？）：', err.message)
  }
}
