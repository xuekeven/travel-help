import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { WaitlistOrder, WaitlistGroup, WaitlistNeedSegment } from '@/types'
import styles from './index.module.scss'

function NeedSegmentRows({ segments }: { segments: WaitlistNeedSegment[] }) {
  const list = segments?.length ? segments : []
  return (
    <div className={styles.needRows}>
      {list.map((seg) => (
        <div key={`${seg.index}-${seg.trainCode}-${seg.toStation}`} className={styles.needRow}>
          <span className={styles.idx}>{seg.index}</span>
          <div className={styles.dep}>
            <span className={styles.station}>{seg.fromStation}</span>
            <span className={styles.time}>{seg.departureTime}</span>
          </div>
          <div className={styles.mid}>
            <span className={styles.code}>{seg.trainCode}</span>
            <span className={styles.arrow} aria-hidden>
              →
            </span>
          </div>
          <div className={styles.arr}>
            <span className={styles.station}>{seg.toStation}</span>
            <span className={styles.time}>{seg.arrivalTime}</span>
          </div>
          <span className={styles.seatCol}>{seg.seatType || '—'}</span>
        </div>
      ))}
    </div>
  )
}

export default function WaitlistGroupCard({ group }: { group: WaitlistGroup }) {
  const columns: ColumnsType<WaitlistOrder> = [
    {
      title: '候补车次',
      key: 'needSegments',
      width: 400,
      render: (_: unknown, r: WaitlistOrder) => (
        <NeedSegmentRows segments={r.needSegments ?? []} />
      ),
    },
    {
      title: '票价',
      dataIndex: 'price',
      width: 100,
      render: (v: number) => `¥${Number(v).toFixed(1)}`,
    },
    {
      title: '出发→到达',
      key: 'time',
      width: 130,
      render: (_: unknown, r: WaitlistOrder) =>
        (r.needSegments?.length ?? 0) > 1
          ? '—'
          : `${r.departureTime} → ${r.arrivalTime}`,
    },
    {
      title: '候补状态',
      dataIndex: 'status',
      width: 90,
    },
    {
      title: '最近同步',
      dataIndex: 'syncedAt',
      width: 170,
      render: (v: string) =>
        new Date(v).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    },
  ]

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span>
          {group.departureDate}&nbsp;&nbsp;
          {group.fromStation} → {group.toStation}
        </span>
        <span className={styles.groupCount}>{group.orders.length} 条候补</span>
      </div>
      <Table
        rowKey="orderNo"
        columns={columns}
        dataSource={group.orders}
        pagination={false}
        size="small"
      />
    </div>
  )
}
