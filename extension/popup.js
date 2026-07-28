const enabledInput = document.getElementById('enabled')
const serverUrlInput = document.getElementById('serverUrl')
const syncTokenInput = document.getElementById('syncToken')
const saveBtn = document.getElementById('save')
const savedTip = document.getElementById('savedTip')
const testBtn = document.getElementById('testConn')
const testResult = document.getElementById('testResult')

/**
 * 仅填写站点根或 nginx 反代入口（如 /12306），不要带 /api；请求时会自动拼 /api/...
 */
function normalizeServerBase(input) {
  let s = input.trim().replace(/\/+$/, '')
  if (s.endsWith('/api')) s = s.replace(/\/api$/, '')
  return s
}

async function ensureServerPermission(serverUrl) {
  let origin
  try {
    const parsed = new URL(serverUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    origin = `${parsed.origin}/*`
  } catch {
    return false
  }

  const granted = await chrome.permissions.contains({ origins: [origin] })
  return granted || chrome.permissions.request({ origins: [origin] })
}

chrome.storage.sync.get(['enabled', 'serverUrl', 'syncToken'], (result) => {
  enabledInput.checked = result.enabled === true
  if (result.serverUrl) {
    serverUrlInput.value = normalizeServerBase(result.serverUrl)
  }
  if (result.syncToken) syncTokenInput.value = result.syncToken
})

saveBtn.addEventListener('click', async () => {
  const enabled = enabledInput.checked
  const url = normalizeServerBase(serverUrlInput.value)
  const token = syncTokenInput.value.trim()

  if (!url || !(await ensureServerPermission(url))) {
    showTestResult('请填写有效地址并允许访问该服务器', false)
    return
  }

  chrome.storage.sync.set({ enabled, serverUrl: url, syncToken: token }, () => {
    savedTip.style.display = 'block'
    setTimeout(() => { savedTip.style.display = 'none' }, 2500)
  })
})

enabledInput.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledInput.checked })
})

testBtn.addEventListener('click', async () => {
  const url = normalizeServerBase(serverUrlInput.value)
  const token = syncTokenInput.value.trim()

  if (!url) {
    showTestResult('请先填写服务器地址', false)
    return
  }

  testBtn.textContent = '测试中...'
  testBtn.disabled = true

  try {
    if (!(await ensureServerPermission(url))) {
      showTestResult('未获得该服务器的访问权限', false)
      return
    }
    const res = await chrome.runtime.sendMessage({
      type: 'TEST_NOTIFY',
      serverUrl: url,
      syncToken: token,
    })
    if (res?.error) {
      showTestResult(`✗ 连接失败：${res.error}`, false)
      return
    }
    if (res?.ok) {
      showTestResult('✓ 连接成功，服务正常', true)
    } else {
      showTestResult(`✗ 服务返回 ${res?.status ?? '?'}，请检查地址和 Token`, false)
    }
  } catch (err) {
    showTestResult(`✗ 连接失败：${err?.message ?? err}`, false)
  } finally {
    testBtn.textContent = '测试连接'
    testBtn.disabled = false
  }
})

function showTestResult(msg, ok) {
  testResult.textContent = msg
  testResult.className = `test-result ${ok ? 'ok' : 'err'}`
  testResult.style.display = 'block'
}
