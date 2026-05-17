import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import '@/styles/globals.scss'

export const metadata: Metadata = {
  title: '12306 买票助手',
  description: '个人火车票购票提醒与候补订单管理工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
