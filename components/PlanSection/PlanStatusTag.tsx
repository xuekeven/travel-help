import { Tag } from 'antd'
import type { Dayjs } from 'dayjs'
import type { PlanStatus } from '@/types'
import { PLAN_STATUS_COLORS, PLAN_STATUS_LABELS } from '@/types'
import { getAutoPlanStatus } from '@/lib/date'

export function getPlanStatusForDepartureDate(departureDate: Date | string | Dayjs): PlanStatus {
  const date =
    typeof departureDate === 'object' && 'toDate' in departureDate
      ? departureDate.toDate()
      : departureDate

  return getAutoPlanStatus(date)
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
