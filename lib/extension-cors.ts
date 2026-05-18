import { NextResponse } from 'next/server'

/** 扩展 Service Worker / options 页跨域 POST 会先 OPTIONS 预检；curl 默认不预检故仍可能成功 */
const EXTENSION_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-sync-token',
  'Access-Control-Max-Age': '86400',
  /** Chrome 访问解析到 CGNAT/Tailscale 等地址时，预检可能带 Access-Control-Request-Private-Network */
  'Access-Control-Allow-Private-Network': 'true',
}

export function mergeExtensionCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(EXTENSION_CORS_HEADERS)) {
    res.headers.set(k, v)
  }
  return res
}

export function optionsExtensionCors(): NextResponse {
  return new NextResponse(null, { status: 204, headers: EXTENSION_CORS_HEADERS })
}
