const statusEl = document.getElementById('status')
const openOptionsBtn = document.getElementById('openOptions')

chrome.storage.sync.get(['serverUrl', 'syncToken'], (result) => {
  if (result.serverUrl) {
    statusEl.innerHTML = `服务器：<span>${result.serverUrl}</span>`
  } else {
    statusEl.textContent = '尚未配置服务器地址，请先完成设置。'
  }
})

openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})
