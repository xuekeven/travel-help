'use client'

import { QuestionCircleOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import styles from './index.module.scss'

interface SectionTitleProps {
  title: string
  tips: string[]
  titleHref?: string
}

export default function SectionTitle({ title, tips, titleHref }: SectionTitleProps) {
  return (
    <div className={styles.titleRow}>
      <h2>
        {titleHref ? (
          <a
            href={titleHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleLink}
          >
            {title}
          </a>
        ) : title}
      </h2>
      <Tooltip
        placement="topLeft"
        styles={{ root: { maxWidth: 'none' } }}
        trigger={['hover', 'focus']}
        title={(
          <div className={styles.tooltipContent}>
            {tips.map((tip, index) => (
              <div key={tip}>{index + 1}、{tip}</div>
            ))}
          </div>
        )}
      >
        <button type="button" className={styles.helpButton} aria-label={`查看${title}说明`}>
          <QuestionCircleOutlined />
        </button>
      </Tooltip>
    </div>
  )
}
