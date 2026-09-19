/**
 * 浏览器端生成应用内地址。
 *
 * 生产环境由 nginx 通过 /travel/ 暴露应用，开发环境则直接使用根路径。
 * 返回绝对路径以确保嵌套路由中的 API 请求和页面链接不会错误地相对解析。
 */
export function withBasePath(path: string): string {
  const normalized = path.replace(/^\/+/, '')
  return process.env.NODE_ENV === 'production' ? `/travel/${normalized}` : `/${normalized}`
}
