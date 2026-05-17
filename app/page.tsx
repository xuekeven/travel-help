import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import PlanSection from '@/components/PlanSection'
import WaitlistSection from '@/components/WaitlistSection'
import styles from './page.module.scss'

export default function HomePage() {
  return (
    <ConfigProvider locale={zhCN}>
      <App>
        <main className={styles.main}>
          <h1 className={styles.title}>12306 买票助手</h1>
          <PlanSection />
          <WaitlistSection />
        </main>
      </App>
    </ConfigProvider>
  )
}
