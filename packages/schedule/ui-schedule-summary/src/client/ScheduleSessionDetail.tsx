/** Active reminder contribution for one Workspace Session hover summary. */

import { useEffect, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CodePilotIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ScheduleSummary } from '../types.ts'
import type { NS } from './locales.ts'

/** Props derived from the Workspace Session-detail slot and locale seat. */
export type ScheduleSessionDetailProps = PropsRuntime<'sidebar.workspaces.session.detail'>
  & PropsLocale<typeof NS>
  & { loadSchedule: (sessionId: string, signal?: AbortSignal) => Promise<ScheduleSummary> }

function compactInstant(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const pad = (part: number): string => String(part).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

/**
 * Render active reminder metadata while its delayed hover card is mounted.
 * @param props - Session facts, owner presentation values, and locale seat.
 * @returns The optional reminder row.
 */
export function ScheduleSessionDetail({ sessionId, detailStyle, loadSchedule, t }: ScheduleSessionDetailProps) {
  const [summary, setSummary] = useState<ScheduleSummary | null>(null)
  useEffect(() => {
    setSummary(null)
    const controller = new AbortController()
    void loadSchedule(sessionId, controller.signal).then((value) => {
      if (value.activeCount > 0) setSummary(value)
    }).catch(() => undefined)
    return () => { controller.abort() }
  }, [loadSchedule, sessionId])

  if (summary === null || summary.nextScheduledAt === undefined) return null
  const value = t(summary.activeCount === 1 ? 'summary.one' : 'summary.other', {
    n: summary.activeCount,
    time: compactInstant(summary.nextScheduledAt),
  })
  const label = t('summary.label')
  return (
    <div className={detailStyle.rowClassName} title={`${label}: ${value}`}>
      <CodePilotIcon name={detailStyle.iconNames.reminder} size={14} />
      <span className={detailStyle.labelClassName}>{label}</span>
      <span className={detailStyle.valueClassName}>{value}</span>
    </div>
  )
}
