'use client'
import { useState, useEffect } from 'react'
import styles from './index.module.scss'

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function RealtimeClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!now) return null

  const month = now.getMonth() + 1
  const day = now.getDate()
  const dayOfWeek = DAYS[now.getDay()]
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')

  return (
    <div className={styles.clock}>
      <span className={styles.date}>{month}月{day}日 {dayOfWeek}</span>
      <span className={styles.time}>{hh}:{mm}:{ss}</span>
    </div>
  )
}
