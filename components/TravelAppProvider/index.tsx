'use client'

import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

export default function TravelAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1746a2',
          colorInfo: '#1746a2',
          colorSuccess: '#23845f',
          colorWarning: '#c57932',
          colorError: '#c65345',
          colorText: '#202521',
          colorTextSecondary: '#6f756e',
          colorBorder: '#ddd5c8',
          colorBgContainer: '#fffaf2',
          borderRadius: 10,
          borderRadiusLG: 16,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Button: { primaryShadow: '0 8px 22px rgba(23, 70, 162, 0.18)' },
          Table: {
            headerBg: '#f4eee4',
            headerColor: '#565d57',
            borderColor: '#e6ded2',
            rowHoverBg: '#fff7eb',
          },
          Modal: { contentBg: '#fffaf2', headerBg: '#fffaf2' },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}
