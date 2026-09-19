'use client'

import { useEffect } from 'react'
import { DatePicker, Form, Input, Modal, Select } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { Trip } from '@/types'

interface FormValues {
  name: string
  dates: [Dayjs, Dayjs]
  cities: string[]
  notes?: string
}

interface Props {
  open: boolean
  trip: Trip | null
  submitting: boolean
  onCancel: () => void
  onSubmit: (value: {
    name: string
    startDate: string
    endDate: string
    cities: string[]
    notes: string | null
  }) => void
}

export default function TripForm({ open, trip, submitting, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (trip) {
      form.setFieldsValue({
        name: trip.name,
        dates: [dayjs(trip.startDate), dayjs(trip.endDate)],
        cities: trip.cities,
        notes: trip.notes ?? undefined,
      })
    } else {
      form.resetFields()
    }
  }, [form, open, trip])

  return (
    <Modal
      title={trip ? '编辑行程' : '创建新行程'}
      open={open}
      confirmLoading={submitting}
      okText={trip ? '保存修改' : '创建行程'}
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSubmit({
          name: values.name.trim(),
          startDate: values.dates[0].format('YYYY-MM-DD'),
          endDate: values.dates[1].format('YYYY-MM-DD'),
          cities: values.cities,
          notes: values.notes?.trim() || null,
        })}
      >
        <Form.Item name="name" label="行程名称" rules={[{ required: true, message: '请输入行程名称' }]}>
          <Input placeholder="例如：成都周末游" maxLength={40} showCount />
        </Form.Item>
        <Form.Item name="dates" label="旅行日期" rules={[{ required: true, message: '请选择旅行日期' }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="cities" label="途经城市" rules={[{ required: true, message: '请至少填写一个城市' }]}>
          <Select mode="tags" tokenSeparators={['、', ',', ' ']} placeholder="输入城市后按回车，可添加多个" />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={3} placeholder="旅行目标、同行人或其他说明" maxLength={300} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
