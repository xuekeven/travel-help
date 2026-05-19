'use client'
import { useEffect, useState, useCallback } from 'react'
import { Radio, Spin, Empty, Typography } from 'antd'
import type { WaitlistGroup } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import { formatDateTimeShanghai } from '@/lib/date'
import WaitlistGroupCard from './WaitlistGroup'
import styles from './index.module.scss'

type SortOption = 'time_asc' | 'time_desc' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'time_asc', label: '出发 早→晚' },
  { value: 'time_desc', label: '出发 晚→早' },
  { value: 'price_asc', label: '票价 低→高' },
  { value: 'price_desc', label: '票价 高→低' },
]

function parseSortOption(opt: SortOption): { sortBy: string; sortDir: string } {
  const [field, dir] = opt.split('_')
  return {
    sortBy: field === 'time' ? 'departureTime' : 'price',
    sortDir: dir,
  }
}

export default function WaitlistSection() {
  const [groups, setGroups] = useState<WaitlistGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('time_asc')
  const [lastSynced, setLastSynced] = useState<string | null>(null)

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
        <h2>
          候补订单
          {lastSynced && (
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, fontWeight: 400, marginLeft: 12 }}
            >
              最近同步：
              {formatDateTimeShanghai(lastSynced)}
            </Typography.Text>
          )}
        </h2>
        <Radio.Group
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          size="small"
          buttonStyle="solid"
        >
          {SORT_OPTIONS.map((opt) => (
            <Radio.Button key={opt.value} value={opt.value}>
              {opt.label}
            </Radio.Button>
          ))}
        </Radio.Group>
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
