import { NextResponse } from 'next/server'
import { sendWeComMessage } from '@/lib/notify'
import { mergeExtensionCors, optionsExtensionCors } from '@/lib/extension-cors'

export function OPTIONS() {
  return optionsExtensionCors()
}

export async function POST() {
  await sendWeComMessage('这是一条来自 12306 买票助手的测试通知，服务运行正常 ✅')
  return mergeExtensionCors(
    NextResponse.json({ success: true, message: '通知已触发，请查看服务器控制台' })
  )
}
