'use client'
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import {
  Modal, Form, Input, Select, DatePicker, Button,
  InputNumber, Row, Col, message,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import type { TravelPlan } from '@/types'
import { SEAT_TYPE_LABELS } from '@/types'
import { withBasePath } from '@/lib/with-base-path'
import PlanStatusTag, { getPlanStatusForSaleDate } from './PlanStatusTag'
import styles from './index.module.scss'

interface Props {
  open: boolean
  editingPlan: TravelPlan | null
  onSuccess: () => void
  onCancel: () => void
}

const SEAT_OPTIONS = Object.entries(SEAT_TYPE_LABELS).map(([value, label]) => ({ value, label }))

dayjs.locale('zh-cn')

function StatusDisplay({ saleDate }: { saleDate?: dayjs.Dayjs }) {
  const status = saleDate ? getPlanStatusForSaleDate(saleDate) : null

  return (
    <div className={styles.statusDisplay}>
      {status ? <PlanStatusTag status={status} /> : (
        <span className={styles.statusPlaceholder}>选择开售时间后自动计算</span>
      )}
    </div>
  )
}

function SaleTimeStatus({ fieldName }: { fieldName: number }) {
  const saleDate = Form.useWatch(['saleTimes', fieldName]) as dayjs.Dayjs | undefined

  return (
    <Form.Item label="状态" className={styles.saleTimeStatus}>
      <StatusDisplay saleDate={saleDate} />
    </Form.Item>
  )
}

export default function PlanForm({ open, editingPlan, onSuccess, onCancel }: Props) {
  const [form] = Form.useForm()
  const isEdit = !!editingPlan
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  })

  useEffect(() => {
    if (!open) return
    setModalOffset({ x: 0, y: 0 })
    if (editingPlan) {
      form.setFieldsValue({
        departureDate: dayjs(editingPlan.departureDate),
        saleTimes: [
          dayjs(editingPlan.saleDate),
          ...(editingPlan.additionalSaleDates ?? []).map((value) => dayjs(value)),
        ],
        holidayName: editingPlan.holidayName,
        fromStation: editingPlan.fromStation,
        toStation: editingPlan.toStation,
        seatType: editingPlan.seatType,
        ticketCount: editingPlan.ticketCount,
        remark: editingPlan.remark,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ ticketCount: 1, saleTimes: [undefined] })
    }
  }, [open, editingPlan, form])

  const handleTitlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: modalOffset.x,
      originY: modalOffset.y,
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setModalOffset({
        x: dragRef.current.originX + moveEvent.clientX - dragRef.current.startX,
        y: dragRef.current.originY + moveEvent.clientY - dragRef.current.startY,
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const { saleTimes, ...restValues } = values
    const normalizedSaleTimes = saleTimes as dayjs.Dayjs[]
    const body = {
      ...restValues,
      departureDate: (values.departureDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      saleDate: normalizedSaleTimes[0].second(0).millisecond(0).toISOString(),
      additionalSaleDates: normalizedSaleTimes.slice(1).map(
        (value) => value.second(0).millisecond(0).toISOString()
      ),
    }
    const path = isEdit ? `/api/plans/${editingPlan!.id}` : '/api/plans'
    const res = await fetch(withBasePath(path), {
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
      title={
        <div
          onPointerDown={handleTitlePointerDown}
          style={{ cursor: 'move', userSelect: 'none' }}
        >
          {isEdit ? '编辑购票计划' : '新增购票计划'}
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      width={680}
      centered
      modalRender={(modal) => (
        <div style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}>
          {modal}
        </div>
      )}
      styles={{
        body: {
          // 超过可视区高度时，body 可滚动；正常居中展示
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto',
          paddingRight: 4,
        },
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {/* 第一行：出行日期 + 节假日信息 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="departureDate"
              label="出行日期"
              rules={[{ required: true, message: '请选择出行日期' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="选择乘车日期"
                onChange={(value) => {
                  form.setFieldValue(
                    ['saleTimes', 0],
                    value ? value.subtract(14, 'day').hour(8).minute(0).second(0).millisecond(0) : null
                  )
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="holidayName" label="节假日信息">
              <Input placeholder="如：劳动节、国庆节" />
            </Form.Item>
          </Col>
        </Row>

        {/* 第三行：始发站 + 终到站 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fromStation"
              label="始发站"
              rules={[{ required: true, message: '请填写始发站' }]}
            >
              <Input placeholder="如：北京南站" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="toStation"
              label="终到站"
              rules={[{ required: true, message: '请填写终到站' }]}
            >
              <Input placeholder="如：天津南站" />
            </Form.Item>
          </Col>
        </Row>

        {/* 第四行：座位类型 + 购票张数 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="seatType"
              label="座位类型"
              rules={[{ required: true, message: '请选择座位类型' }]}
            >
              <Select options={SEAT_OPTIONS} placeholder="请选择" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ticketCount" label="购票张数">
              <InputNumber min={1} max={5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* 第五行：备注（占满整行） */}
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="可填写备注信息" />
        </Form.Item>

        <div className={styles.saleDateFields}>
          <Form.List name="saleTimes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, ...field }, index) => (
                  <div
                    className={`${styles.saleTimeRow} ${fields.length > 1 ? styles.saleTimeRowWithDelete : ''}`}
                    key={key}
                  >
                    <Form.Item
                      {...field}
                      className={styles.saleTimeItem}
                      label={index === 0 ? '开售时间' : `开售时间${index + 1}`}
                      rules={[{
                        required: true,
                        message: `请选择${index === 0 ? '开售时间' : `开售时间${index + 1}`}`,
                      }]}
                    >
                      <DatePicker
                        showTime={{
                          format: 'HH:mm',
                          defaultOpenValue: dayjs().hour(8).minute(0).second(0).millisecond(0),
                        }}
                        format="YYYY-MM-DD HH:mm"
                        style={{ width: '100%' }}
                        placeholder={index === 0 ? '默认提前 14 天，08:00' : '选择开售时间'}
                      />
                    </Form.Item>
                    <SaleTimeStatus fieldName={field.name} />
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className={styles.removeSaleDateButton}
                        aria-label={`删除${index === 0 ? '开售时间' : `开售时间${index + 1}`}`}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </div>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  增加开售时间
                </Button>
              </>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  )
}
