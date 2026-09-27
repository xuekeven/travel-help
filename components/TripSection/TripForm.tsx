'use client'

import { useEffect } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, DatePicker, Form, Input, Modal } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { Trip } from '@/types'
import styles from './TripForm.module.scss'

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
        <Form.Item label="途经城市" required>
          <Form.List
            name="cities"
            initialValue={['']}
            rules={[{
              validator: async (_, cities) => {
                if (!cities?.some((city: string) => city?.trim())) {
                  throw new Error('请至少填写一个城市')
                }
              },
            }]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div className={styles.cityList}>
                {fields.map((field, index) => (
                  <div className={styles.cityRow} key={field.key}>
                    <span className={styles.stopNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <Form.Item
                      {...field}
                      className={styles.cityField}
                      rules={[{ required: true, whitespace: true, message: '请输入城市' }]}
                    >
                      <Input placeholder={index === 0 ? '出发城市' : '下一站城市（可以与前面重复）'} maxLength={30} />
                    </Form.Item>
                    <Button
                      aria-label={`删除第 ${index + 1} 个城市`}
                      icon={<DeleteOutlined />}
                      disabled={fields.length === 1}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')} block>
                  添加下一站
                </Button>
                <Form.ErrorList errors={errors} />
                <span className={styles.cityHint}>城市可重复添加，并按顺序组成完整路线。</span>
              </div>
            )}
          </Form.List>
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={3} placeholder="旅行目标、同行人或其他说明" maxLength={300} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
