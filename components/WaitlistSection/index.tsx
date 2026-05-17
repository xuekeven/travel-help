'use client'
import { useEffect, useState, useCallback } from 'react'
import { Radio, Spin, Empty, Typography } from 'antd'
import type { WaitlistGroup } from '@/types'
import WaitlistGroupCard from './WaitlistGroup'
import styles from './index.module.scss'

export default function WaitlistSection() {
  const [groups, setGroups] = useState<WaitlistGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'departureTime' | 'price'>('departureTime')
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/waitlist?sortBy=${sortBy}`)
      const json = await res.json()
      setGroups(json.data)
      if (json.data.length > 0) {
        const allOrders = json.data.flatMap((g: WaitlistGroup) => g.orders)
        const latest = allOrders.sort(
          (a: any, b: any) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
        )[0]
        setLastSynced(latest?.syncedAt ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [sortBy])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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
              {new Date(lastSynced).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
            </Typography.Text>
          )}
        </h2>
        <Radio.Group
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          size="small"
          buttonStyle="solid"
        >
          <Radio.Button value="departureTime">按出发时间</Radio.Button>
          <Radio.Button value="price">按票价</Radio.Button>
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
