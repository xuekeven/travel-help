'use client'

import { useEffect } from 'react'
import { DatePicker, Form, Input, InputNumber, Modal, Select, TimePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { PlaceCategory, PlaceVisitStatus, TripPlace } from '@/types'

interface FormValues {
  name: string
  category: PlaceCategory
  visitStatus: PlaceVisitStatus
  city?: string
  address?: string
  latitude: number
  longitude: number
  plannedDate?: Dayjs
  plannedTime?: Dayjs
  notes?: string
  guideUrl?: string
}

export interface PlacePayload {
  name: string
  category: PlaceCategory
  visitStatus: PlaceVisitStatus
  city: string | null
  address: string | null
  latitude: number
  longitude: number
  plannedDate: string | null
  plannedTime: string | null
  notes: string | null
  guideUrl: string | null
}

export default function PlaceForm({
  open,
  place,
  pickedPosition,
  tripCities,
  tripStartDate,
  tripEndDate,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean
  place: TripPlace | null
  pickedPosition: { latitude: number; longitude: number } | null
  tripCities: string[]
  tripStartDate: string
  tripEndDate: string
  submitting: boolean
  onCancel: () => void
  onSubmit: (payload: PlacePayload) => void
}) {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    if (place) {
      form.setFieldsValue({
        name: place.name,
        category: place.category,
        visitStatus: place.visitStatus,
        city: place.city ?? undefined,
        address: place.address ?? undefined,
        latitude: place.latitude,
        longitude: place.longitude,
        plannedDate: place.plannedDate ? dayjs(place.plannedDate) : undefined,
        plannedTime: place.plannedTime ? dayjs('2000-01-01T' + place.plannedTime) : undefined,
        notes: place.notes ?? undefined,
        guideUrl: place.guideUrl ?? undefined,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        category: 'ATTRACTION',
        visitStatus: 'WISHLIST',
        city: tripCities[0],
        latitude: pickedPosition?.latitude,
        longitude: pickedPosition?.longitude,
      })
    }
  }, [form, open, pickedPosition, place, tripCities])

  const start = dayjs(tripStartDate).startOf('day')
  const end = dayjs(tripEndDate).endOf('day')

  return (
    <Modal
      title={place ? '编辑地点' : '收藏新地点'}
      open={open}
      width={640}
      confirmLoading={submitting}
      okText={place ? '保存修改' : '加入行程'}
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
          category: values.category,
          visitStatus: values.visitStatus,
          city: values.city?.trim() || null,
          address: values.address?.trim() || null,
          latitude: values.latitude,
          longitude: values.longitude,
          plannedDate: values.plannedDate?.format('YYYY-MM-DD') || null,
          plannedTime: values.plannedTime?.format('HH:mm') || null,
          notes: values.notes?.trim() || null,
          guideUrl: values.guideUrl?.trim() || null,
        })}
      >
        <Form.Item name="name" label="地点名称" rules={[{ required: true, message: '请输入地点名称' }]}>
          <Input placeholder="例如：宽窄巷子、陈麻婆豆腐" maxLength={80} showCount />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={[
              { value: 'FOOD', label: '美食' },
              { value: 'ATTRACTION', label: '景点' },
              { value: 'HOTEL', label: '酒店' },
              { value: 'TRANSPORT', label: '交通' },
              { value: 'SHOPPING', label: '购物' },
              { value: 'OTHER', label: '其他' },
            ]} />
          </Form.Item>
          <Form.Item name="visitStatus" label="状态" rules={[{ required: true }]}>
            <Select options={[
              { value: 'WISHLIST', label: '想去' },
              { value: 'PLANNED', label: '已安排' },
              { value: 'VISITED', label: '已去' },
            ]} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
          <Form.Item name="city" label="城市">
            <Select allowClear showSearch options={tripCities.map((city) => ({ value: city, label: city }))} />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="选填，便于记录具体位置" maxLength={200} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Form.Item name="plannedDate" label="计划日期">
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(date) => date.startOf('day').isBefore(start) || date.endOf('day').isAfter(end)}
            />
          </Form.Item>
          <Form.Item name="plannedTime" label="计划时间">
            <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Form.Item name="latitude" label="纬度" rules={[{ required: true, message: '请选择地图位置' }]}>
            <InputNumber style={{ width: '100%' }} min={-90} max={90} precision={6} />
          </Form.Item>
          <Form.Item name="longitude" label="经度" rules={[{ required: true, message: '请选择地图位置' }]}>
            <InputNumber style={{ width: '100%' }} min={-180} max={180} precision={6} />
          </Form.Item>
        </div>
        <Form.Item name="notes" label="攻略与备注">
          <Input.TextArea rows={4} placeholder="营业时间、必点菜、游览建议、避坑信息……" maxLength={1000} showCount />
        </Form.Item>
        <Form.Item name="guideUrl" label="攻略链接" rules={[{ type: 'url', message: '请输入完整的 http(s) 链接' }]}>
          <Input placeholder="https://..." maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
