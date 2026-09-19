import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import PlanSection from '@/components/PlanSection'
import TravelOrderSection from '@/components/TravelOrderSection'
import WaitlistSection from '@/components/WaitlistSection'
import RealtimeClock from '@/components/RealtimeClock'
import styles from './page.module.scss'

export default function HomePage() {
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
      <App>
        <main className={styles.main} id="top">
          <header className={styles.topbar}>
            <a className={styles.brand} href="#top" aria-label="Travel Help 首页">
              <span className={styles.brandMark} aria-hidden>⌁</span>
              <span className={styles.brandCopy}>
                <strong>Travel Help</strong>
                <small>旅行助手</small>
              </span>
            </a>
            <nav className={styles.nav} aria-label="火车出行模块导航">
              <a href="#plans">购票计划</a>
              <a href="#orders">出行订单</a>
              <a href="#waitlist">候补订单</a>
            </nav>
            <RealtimeClock />
          </header>

          <section className={styles.moduleIntro}>
            <div>
              <span className={styles.kicker}>RAIL JOURNEY</span>
              <h2>火车出行</h2>
            </div>
            <p>从开售准备到订单同步，按旅程阶段管理每一项信息。</p>
          </section>

          <div className={styles.journeyFlow}>
            <PlanSection />
            <TravelOrderSection />
            <WaitlistSection />
          </div>

          <footer className={styles.footer}>
            <span>Travel Help</span>
            <span>为每一次从容出发而设计</span>
          </footer>
        </main>
      </App>
    </ConfigProvider>
  )
}
