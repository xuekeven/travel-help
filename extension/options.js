const serverUrlInput = document.getElementById('serverUrl')
const syncTokenInput = document.getElementById('syncToken')
const saveBtn = document.getElementById('save')
const savedTip = document.getElementById('savedTip')
const testBtn = document.getElementById('testConn')
const testResult = document.getElementById('testResult')

// 读取已保存的配置
chrome.storage.sync.get(['serverUrl', 'syncToken'], (result) => {
  if (result.serverUrl) serverUrlInput.value = result.serverUrl
  if (result.syncToken) syncTokenInput.value = result.syncToken
})

// 保存配置
saveBtn.addEventListener('click', () => {
  const url = serverUrlInput.value.trim().replace(/\/$/, '')
  const token = syncTokenInput.value.trim()

  chrome.storage.sync.set({ serverUrl: url, syncToken: token }, () => {
    savedTip.style.display = 'block'
    setTimeout(() => { savedTip.style.display = 'none' }, 2500)
  })
})

// 测试连通性（调用 /api/notify/test 接口）
testBtn.addEventListener('click', async () => {
  const url = serverUrlInput.value.trim().replace(/\/$/, '')
  const token = syncTokenInput.value.trim()

  if (!url) {
    showTestResult('请先填写服务器地址', false)
    return
  }

  testBtn.textContent = '测试中...'
  testBtn.disabled = true

  try {
    const res = await fetch(`${url}/api/notify/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': token,
      },
    })
    if (res.ok) {
      showTestResult('✓ 连接成功，服务正常', true)
    } else {
      showTestResult(`✗ 服务返回 ${res.status}，请检查地址和 Token`, false)
    }
  } catch (err) {
    showTestResult(`✗ 连接失败：${err.message}`, false)
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
