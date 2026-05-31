import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import PlanSection from '@/components/PlanSection'
import TravelOrderSection from '@/components/TravelOrderSection'
import WaitlistSection from '@/components/WaitlistSection'
import RealtimeClock from '@/components/RealtimeClock'
import styles from './page.module.scss'

export default function HomePage() {
  return (
    <ConfigProvider locale={zhCN}>
      <App>
        <main className={styles.main}>
          <div className={styles.pageHeader}>
          <h1 className={styles.title}>12306 买票助手</h1>
          <RealtimeClock />
          </div>
          <PlanSection />
          <TravelOrderSection />
          <WaitlistSection />
        </main>
      </App>
    </ConfigProvider>
  )
}
