'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Popconfirm, message, Tooltip } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType, SorterResult } from 'antd/es/table/interface'
import type { TravelPlan } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import { SEAT_TYPE_LABELS, PLAN_STATUS_LABELS, PLAN_STATUS_COLORS } from '@/types'
import PlanForm from './PlanForm'
import styles from './index.module.scss'

function renderSaleInfo(saleDate: string, daysUntilSale: number) {
  let label: string
  let color: string

  if (daysUntilSale < 0) {
    label = '已开售'
    color = '#999'
  } else if (daysUntilSale === 0) {
    label = '今天'
    color = '#f5222d'
  } else if (daysUntilSale === 1) {
    label = '明天'
    color = '#fa8c16'
  } else {
    label = `还有${daysUntilSale}天`
    color = '#1677ff'
  }

  return (
    <span>
      {saleDate}&nbsp;
      <span style={{ color, fontWeight: 500 }}>（{label}）</span>
    </span>
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

  const columns: ColumnsType<TravelPlan> = [
    {
      title: '出行日期',
      dataIndex: 'departureDate',
      width: 120,
      sorter: (a, b) => a.departureDate.localeCompare(b.departureDate),
      sortDirections: ['ascend', 'descend', 'ascend'],
      defaultSortOrder: 'ascend',
    },
    {
      title: '节假日',
      dataIndex: 'holidayName',
      width: 88,
      render: (v: string | null) =>
        v ? <Tag color="gold">{v}</Tag> : <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '始发站',
      dataIndex: 'fromStation',
      width: 120,
    },
    {
      title: '终到站',
      dataIndex: 'toStation',
      width: 120,
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
      title: '状态',
      dataIndex: 'status',
      width: 95,
      render: (v: string) => (
        <Tag color={PLAN_STATUS_COLORS[v as keyof typeof PLAN_STATUS_COLORS]}>
          {PLAN_STATUS_LABELS[v as keyof typeof PLAN_STATUS_LABELS] ?? v}
        </Tag>
      ),
    },
    {
      title: '开售日期',
      key: 'saleInfo',
      width: 190,
      render: (_: unknown, r: TravelPlan) => renderSaleInfo(r.saleDate, r.daysUntilSale),
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
      width: 110,
      fixed: 'right',
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
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: '暂无出行计划，点击右上角添加' }}
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
