'use client'
import { useEffect } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, message } from 'antd'
import dayjs from 'dayjs'
import type { TravelPlan } from '@/types'
import { SEAT_TYPE_LABELS, PLAN_STATUS_LABELS } from '@/types'

interface Props {
  open: boolean
  editingPlan: TravelPlan | null
  onSuccess: () => void
  onCancel: () => void
}

const SEAT_OPTIONS = Object.entries(SEAT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const STATUS_OPTIONS = Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export default function PlanForm({ open, editingPlan, onSuccess, onCancel }: Props) {
  const [form] = Form.useForm()
  const isEdit = !!editingPlan

  useEffect(() => {
    if (!open) return
    if (editingPlan) {
      form.setFieldsValue({
        ...editingPlan,
        departureDate: dayjs(editingPlan.departureDate),
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ ticketCount: 1, status: 'PENDING_SALE' })
    }
  }, [open, editingPlan, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    const body = {
      ...values,
      departureDate: (values.departureDate as dayjs.Dayjs).format('YYYY-MM-DD'),
    }

    const url = isEdit ? `/api/plans/${editingPlan!.id}` : '/api/plans'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      message.success(isEdit ? '更新成功' : '新增成功')
      onSuccess()
    } else {
      const err = await res.json().catch(() => ({}))
      message.error(`操作失败：${err?.error ?? '请重试'}`)
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑出行计划' : '新增出行计划'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="departureDate"
          label="出行日期"
          rules={[{ required: true, message: '请选择出行日期' }]}
        >
          <DatePicker style={{ width: '100%' }} placeholder="选择乘车日期" />
        </Form.Item>

        <Form.Item name="holidayName" label="节假日名称（可选）">
          <Input placeholder="如：劳动节、国庆节" />
        </Form.Item>

        <Form.Item
          name="fromStation"
          label="始发站"
          rules={[{ required: true, message: '请填写始发站' }]}
        >
          <Input placeholder="如：北京南站" />
        </Form.Item>

        <Form.Item
          name="toStation"
          label="终到站"
          rules={[{ required: true, message: '请填写终到站' }]}
        >
          <Input placeholder="如：天津南站" />
        </Form.Item>

        <Form.Item
          name="seatType"
          label="座位类型"
          rules={[{ required: true, message: '请选择座位类型' }]}
        >
          <Select options={SEAT_OPTIONS} placeholder="请选择" />
        </Form.Item>

        <Form.Item name="ticketCount" label="购票张数">
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select options={STATUS_OPTIONS} placeholder="请选择" />
        </Form.Item>

        <Form.Item name="remark" label="备注（可选）">
          <Input.TextArea rows={2} placeholder="可填写备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
