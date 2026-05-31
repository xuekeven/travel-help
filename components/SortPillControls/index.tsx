'use client'

import styles from './index.module.scss'

export type SortPillDirection = 'asc' | 'desc'

export interface SortPillOption {
  key: string
  label: string
  active: boolean
  direction: SortPillDirection
  onClick: () => void
}

interface SortPillControlsProps {
  options: SortPillOption[]
  ariaLabel: string
}

function SortIcon({ active, direction }: { active: boolean; direction: SortPillDirection }) {
  return (
    <span className={styles.sortIcon} aria-hidden>
      <span className={`${styles.triangle} ${styles.up} ${active && direction === 'asc' ? styles.active : ''}`} />
      <span className={`${styles.triangle} ${styles.down} ${active && direction === 'desc' ? styles.active : ''}`} />
    </span>
  )
}

export default function SortPillControls({ options, ariaLabel }: SortPillControlsProps) {
  return (
    <div className={styles.sortControls} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`${styles.sortButton} ${option.active ? styles.active : ''}`}
          onClick={option.onClick}
        >
          <span>{option.label}</span>
          <SortIcon active={option.active} direction={option.direction} />
        </button>
      ))}
    </div>
  )
}
