/**
 * 浏览器端请求本应用 API。
 *
 * 不再使用 Next basePath。生产环境由 nginx 将 `/travel/` 反代到 Next 根路径，
 * 因此这里返回相对路径，让页面位于 `/travel/` 时自然请求 `/travel/api/...`。
 */
export function withBasePath(path: string): string {
  return path.replace(/^\/+/, '')
}
