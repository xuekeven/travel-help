'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Popconfirm, message, Tooltip } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table/interface'
import type { TravelPlan } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import { SEAT_TYPE_LABELS } from '@/types'
import { formatDepartureDateWithWeekday, formatSaleDateTimeShanghai } from '@/lib/date'
import PlanForm from './PlanForm'
import PlanStatusTag, { getPlanStatusForSaleDate } from './PlanStatusTag'
import SectionTitle from '@/components/SectionTitle'
import styles from './index.module.scss'

function SaleTimeCell({ value }: { value?: string }) {
  if (!value) return <span style={{ color: '#bbb' }}>-</span>

  return (
    <div className={styles.saleTimeCell}>
      <span className={styles.saleTimeValue}>{formatSaleDateTimeShanghai(value)}</span>
      <PlanStatusTag status={getPlanStatusForSaleDate(value)} />
    </div>
  )
}

export default function PlanSection() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TravelPlan | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(withBasePath('/api/plans'))
      const json = await res.json()
      setPlans(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleDelete = async (id: string) => {
    const res = await fetch(withBasePath(`/api/plans/${id}`), { method: 'DELETE' })
    if (res.ok) {
      message.success('删除成功')
      fetchPlans()
    } else {
      message.error('删除失败，请重试')
    }
  }

  const handleEdit = (plan: TravelPlan) => {
    setEditingPlan(plan)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditingPlan(null)
    setModalOpen(true)
  }

  const maxAdditionalSaleDateCount = plans.reduce(
    (max, plan) => Math.max(max, plan.additionalSaleDates?.length ?? 0),
    0
  )

  const columns: ColumnsType<TravelPlan> = [
    {
      title: '出行日期',
      dataIndex: 'departureDate',
      width: 150,
      sorter: (a, b) => a.departureDate.localeCompare(b.departureDate),
      sortDirections: ['ascend', 'descend', 'ascend'],
      defaultSortOrder: 'ascend',
      render: (v: string) => <span className={styles.dateStrong}>{formatDepartureDateWithWeekday(v)}</span>,
    },
    {
      title: '节假日信息',
      dataIndex: 'holidayName',
      width: 120,
      render: (v: string | null) =>
        v ? <Tag color="gold">{v}</Tag> : <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '开售时间',
      key: 'saleInfo',
      width: 190,
      render: (_: unknown, record: TravelPlan) => <SaleTimeCell value={record.saleDate} />,
    },
    ...Array.from({ length: maxAdditionalSaleDateCount }, (_, index) => ({
      title: `开售时间${index + 2}`,
      key: `additionalSaleDate-${index}`,
      width: 190,
      render: (_: unknown, record: TravelPlan) => {
        const saleDateValue = record.additionalSaleDates?.[index]
        return <SaleTimeCell value={saleDateValue} />
      },
    })),
    {
      title: '始发站',
      dataIndex: 'fromStation',
      width: 110,
    },
    {
      title: '终到站',
      dataIndex: 'toStation',
      width: 110,
    },
    {
      title: '座位',
      dataIndex: 'seatType',
      width: 80,
      render: (v: string) => SEAT_TYPE_LABELS[v as keyof typeof SEAT_TYPE_LABELS] ?? v,
    },
    {
      title: '张数',
      dataIndex: 'ticketCount',
      width: 55,
      align: 'center',
    },

    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <span style={{ color: '#555' }}>{v}</span>
          </Tooltip>
        ) : (
          <span style={{ color: '#bbb' }}>-</span>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: TravelPlan) => (
        <>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这条购票计划？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <SectionTitle
          title="购票计划"
          tips={[
            '首个默认开售时间按出行日期提前 14 天的 08:00 计算，可修改',
            '可以新增多个开售时间，所有开售时间都会在售前 24 小时和售前 15 分钟发送提醒',
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增购票计划
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={plans}
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: '暂无购票计划，点击右上角添加' }}
      />

      <PlanForm
        open={modalOpen}
        editingPlan={editingPlan}
        onSuccess={() => { setModalOpen(false); fetchPlans() }}
        onCancel={() => setModalOpen(false)}
      />
    </section>
  )
}
