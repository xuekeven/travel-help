import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import '@/styles/globals.scss'

export const metadata: Metadata = {
  title: 'Travel Help · 旅行助手',
  description: '管理出行计划、订单与提醒的个人旅行助手',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="favicon.ico" />
      </head>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
