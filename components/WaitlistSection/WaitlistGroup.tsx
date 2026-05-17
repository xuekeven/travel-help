import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { WaitlistOrder, WaitlistGroup } from '@/types'
import styles from './index.module.scss'

export default function WaitlistGroupCard({ group }: { group: WaitlistGroup }) {
  const columns: ColumnsType<WaitlistOrder> = [
    {
      title: '候补车次',
      dataIndex: 'trainNumbers',
      render: (trains: string[]) =>
        trains.map((t) => (
          <Tag key={t} color="blue">
            {t}
          </Tag>
        )),
    },
    {
      title: '座位类型',
      dataIndex: 'seatType',
      width: 90,
    },
    {
      title: '票价',
      dataIndex: 'price',
      width: 90,
      render: (v: number) => `¥${Number(v).toFixed(1)}`,
    },
    {
      title: '出发→到达',
      key: 'time',
      width: 130,
      render: (_: unknown, r: WaitlistOrder) => `${r.departureTime} → ${r.arrivalTime}`,
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
