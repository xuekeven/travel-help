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
            <div className={styles.titleGroup}>
              <span className={styles.eyebrow}>Railway Companion</span>
              <h1 className={styles.title}>12306 买票助手</h1>
              <p className={styles.subtitle}>把购票计划、出行订单、候补订单收进一个清爽面板。</p>
            </div>
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
