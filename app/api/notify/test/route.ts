import { NextResponse } from 'next/server'
import { sendWeComMessage } from '@/lib/notify'

export async function POST() {
  await sendWeComMessage('这是一条来自 12306 买票助手的测试通知，服务运行正常 ✅')
  return NextResponse.json({ success: true, message: '通知已触发，请查看服务器控制台' })
}
