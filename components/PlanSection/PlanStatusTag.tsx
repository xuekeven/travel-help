import { Tag } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { PlanStatus } from '@/types'
import { PLAN_STATUS_COLORS, PLAN_STATUS_LABELS } from '@/types'
import { getAutoPlanStatusForSaleDate } from '@/lib/date'

export function getPlanStatusForSaleDate(saleDate: Date | string | Dayjs): PlanStatus {
  return getAutoPlanStatusForSaleDate(dayjs.isDayjs(saleDate) ? saleDate.toDate() : saleDate)
}

export default function PlanStatusTag({ status }: { status: PlanStatus }) {
  return (
    <Tag
      color={PLAN_STATUS_COLORS[status]}
      variant="filled"
      style={{
        background: 'transparent',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        marginInlineEnd: 0,
        paddingInline: 0,
      }}
    >
      {PLAN_STATUS_LABELS[status]}
    </Tag>
  )
}
