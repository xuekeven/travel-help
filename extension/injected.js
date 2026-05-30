/**
 * 12306 买票助手 · Main World 脚本
 *
 * 12306 页面使用的是 XMLHttpRequest（而非 fetch），
 * 通过覆盖 XMLHttpRequest.prototype 拦截候补订单接口响应，
 * 将数据通过 postMessage 传给 content.js（Isolated World）。
 */
;(function () {
  const INTERCEPT_KEYWORDS = ['/otn/afterNateOrder/queryUnHonourHOrder']

  function notify(type, payload) {
    window.postMessage({ source: '12306_HELPER', type, payload }, '*')
  }

  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._interceptUrl = typeof url === 'string' ? url : ''
    return originalOpen.call(this, method, url, ...rest)
  }

  XMLHttpRequest.prototype.send = function (...args) {
    if (INTERCEPT_KEYWORDS.some((kw) => this._interceptUrl.includes(kw))) {
      this.addEventListener('load', function () {
        try {
          const json = JSON.parse(this.responseText)
          window.postMessage(
            { source: '12306_HELPER', type: 'ORDERS_DATA', payload: json },
            '*'
          )
        } catch (e) {
          notify('HELPER_LOG', {
            level: 'error',
            message: `解析 XHR 响应失败：${e.message}`,
            status: 'error',
          })
          console.warn('[12306助手] 解析 XHR 响应失败：', e.message)
        }
      })
    }
    return originalSend.call(this, ...args)
  }

  console.log('[12306助手] XHR 拦截已就绪（main world）')
  setTimeout(() => {
    notify('HELPER_LOG', {
      level: 'info',
      message: 'XHR 拦截已就绪',
      status: 'ready',
    })
  }, 0)
})()
