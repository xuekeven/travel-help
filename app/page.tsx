'use client'

import { useState } from 'react'
import { Empty } from 'antd'
import { RocketOutlined } from '@ant-design/icons'
import PlanSection from '@/components/PlanSection'
import TravelOrderSection from '@/components/TravelOrderSection'
import WaitlistSection from '@/components/WaitlistSection'
import RealtimeClock from '@/components/RealtimeClock'
import TravelAppProvider from '@/components/TravelAppProvider'
import TripSection from '@/components/TripSection'
import styles from './page.module.scss'

type HomeView = 'trips' | 'rail' | 'flight'

const NAV_ITEMS: Array<{ key: HomeView; label: string }> = [
  { key: 'trips', label: '我的行程' },
  { key: 'rail', label: '火车票' },
  { key: 'flight', label: '飞机票' },
]

export default function HomePage() {
  const [activeView, setActiveView] = useState<HomeView>('trips')

  return (
    <TravelAppProvider>
      <main className={styles.main} id="top">
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.brand}
            aria-label="返回我的行程"
            onClick={() => setActiveView('trips')}
          >
            <span className={styles.brandMark} aria-hidden>⌁</span>
            <span className={styles.brandCopy}>
              <strong>Travel Help</strong>
              <small>旅行助手</small>
            </span>
          </button>
          <nav className={styles.nav} aria-label="主要功能">
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={activeView === item.key ? styles.navActive : undefined}
                aria-current={activeView === item.key ? 'page' : undefined}
                onClick={() => setActiveView(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <RealtimeClock />
        </header>

        {activeView === 'trips' && <TripSection />}

        {activeView === 'rail' && (
          <div className={styles.railPage}>
            <PlanSection />
            <TravelOrderSection />
            <WaitlistSection />
          </div>
        )}

        {activeView === 'flight' && (
          <section className={styles.flightPage}>
            <div className={styles.flightIcon}><RocketOutlined /></div>
            <span>FLIGHT JOURNEY</span>
            <h1>飞机票</h1>
            <p>航班计划与订单管理将在下一阶段接入。</p>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无飞机票记录" />
          </section>
        )}

        <footer className={styles.footer}>
          <span>Travel Help</span>
          <span>为每一次从容出发而设计</span>
        </footer>
      </main>
    </TravelAppProvider>
  )
}
