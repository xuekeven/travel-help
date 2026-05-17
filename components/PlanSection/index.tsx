'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Popconfirm, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TravelPlan } from '@/types'
import { SEAT_TYPE_LABELS, PLAN_STATUS_LABELS, PLAN_STATUS_COLORS } from '@/types'
import PlanForm from './PlanForm'
import styles from './index.module.scss'

function renderDaysUntilSale(days: number) {
  if (days > 0) return <span>{days} 天后</span>
  if (days === 0) return <Tag color="blue">今天开售</Tag>
  if (days === -1) return <span style={{ color: '#999' }}>昨天开售</span>
  return <span style={{ color: '#999' }}>已过开售日</span>
}

export default function PlanSection() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TravelPlan | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plans')
      const json = await res.json()
      setPlans(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
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

  const handleFormSuccess = () => {
    setModalOpen(false)
    fetchPlans()
  }

  const columns: ColumnsType<TravelPlan> = [
    {
      title: '出行日期',
      dataIndex: 'departureDate',
      width: 120,
    },
    {
      title: '节假日',
      dataIndex: 'holidayName',
      width: 90,
      render: (v: string | null) => v || <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '路线',
      key: 'route',
      render: (_: unknown, r: TravelPlan) => (
        <span className={styles.route}>
          {r.fromStation} → {r.toStation}
        </span>
      ),
    },
    {
      title: '座位',
      dataIndex: 'seatType',
      width: 90,
      render: (v: string) => SEAT_TYPE_LABELS[v as keyof typeof SEAT_TYPE_LABELS] ?? v,
    },
    {
      title: '张数',
      dataIndex: 'ticketCount',
      width: 60,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={PLAN_STATUS_COLORS[v as keyof typeof PLAN_STATUS_COLORS]}>
          {PLAN_STATUS_LABELS[v as keyof typeof PLAN_STATUS_LABELS] ?? v}
        </Tag>
      ),
    },
    {
      title: '开售日',
      dataIndex: 'saleDate',
      width: 120,
    },
    {
      title: '距开售',
      dataIndex: 'daysUntilSale',
      width: 100,
      render: renderDaysUntilSale,
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_: unknown, record: TravelPlan) => (
        <>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这条出行计划？"
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
        <h2>出行计划</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增计划
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={plans}
        loading={loading}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无出行计划，点击右上角添加' }}
      />

      <PlanForm
        open={modalOpen}
        editingPlan={editingPlan}
        onSuccess={handleFormSuccess}
        onCancel={() => setModalOpen(false)}
      />
    </section>
  )
}
