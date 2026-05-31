'use client'
import { useEffect, useState, useCallback } from 'react'
import { Spin, Empty, Typography } from 'antd'
import type { WaitlistGroup } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import { formatDateTimeShanghai } from '@/lib/date'
import SortPillControls from '@/components/SortPillControls'
import WaitlistGroupCard from './WaitlistGroup'
import styles from './index.module.scss'

type SortOption = 'time_asc' | 'time_desc' | 'price_asc' | 'price_desc'
type SortField = 'time' | 'price'

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'time', label: '出发时间' },
  { field: 'price', label: '订单票价' },
]

function parseSortOption(opt: SortOption): { sortBy: string; sortDir: string } {
  const [field, dir] = opt.split('_')
  return {
    sortBy: field === 'time' ? 'departureTime' : 'price',
    sortDir: dir,
  }
}

function getSortOption(field: SortField, current: SortOption): SortOption {
  const [currentField, currentDir] = current.split('_') as [SortField, 'asc' | 'desc']
  const nextDir = currentField === field && currentDir === 'asc' ? 'desc' : 'asc'
  return `${field}_${nextDir}`
}

export default function WaitlistSection() {
  const [groups, setGroups] = useState<WaitlistGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('time_asc')
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [activeField, activeDirection] = sortOption.split('_') as [SortField, 'asc' | 'desc']

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { sortBy, sortDir } = parseSortOption(sortOption)
      const res = await fetch(withBasePath(`/api/waitlist?sortBy=${sortBy}&sortDir=${sortDir}`))
      const json = await res.json()
      setGroups(json.data)
      if (json.data.length > 0) {
        const allOrders = json.data.flatMap((g: WaitlistGroup) => g.orders)
        const latest = [...allOrders].sort(
          (a: any, b: any) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
        )[0]
        setLastSynced(latest?.syncedAt ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [sortOption])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h2>候补订单</h2>
            <span className={styles.rule}>
              安装 Chrome 插件后，打开 12306 候补订单页面即可自动同步；未成功订单会在出行前 3 天、2 天、1 天的 00:00 提醒。
            </span>
          </div>
          {lastSynced && (
            <Typography.Text
              type="secondary"
              className={styles.lastSynced}
            >
              最近同步：
              {formatDateTimeShanghai(lastSynced)}
            </Typography.Text>
          )}
        </div>
        <div className={styles.filterRow}>
          <SortPillControls
            ariaLabel="候补订单排序"
            options={SORT_OPTIONS.map((opt) => {
              const active = activeField === opt.field
              return {
                key: opt.field,
                label: opt.label,
                active,
                direction: activeDirection,
                onClick: () => setSortOption(getSortOption(opt.field, sortOption)),
              }
            })}
          />
        </div>
      </div>

      <Spin spinning={loading}>
        {!loading && groups.length === 0 ? (
          <Empty
            description={
              <span>
                暂无候补订单数据
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  请在 Chrome 中安装插件，打开 12306 候补订单页面即可自动同步
                </Typography.Text>
              </span>
            }
          />
        ) : (
          groups.map((group) => <WaitlistGroupCard key={group.groupKey} group={group} />)
        )}
      </Spin>
    </section>
  )
}
