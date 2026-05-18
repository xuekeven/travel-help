import { BASE_PATH } from '@/lib/base-path'

/** 浏览器端 fetch 本应用路径时加上 basePath（不能以 `/` 开头的相对路径会先把 `/` 补上） */
export function withBasePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${normalized}`
}
