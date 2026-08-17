/** Durable provider/model contribution for the Workspace Session hover summary. */

import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CodePilotIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionModelProjection } from '../types.ts'

/** Props derived from the Workspace Session-detail slot and model locale seat. */
export type ModelSessionDetailProps = PropsRuntime<'sidebar.workspaces.session.detail'>
  & PropsLocale<'model'>

/**
 * Render the list-carried durable selection without activating a cold Session.
 * @param props - Session projections, owner presentation values, and locale seat.
 * @returns The optional model row.
 */
export function ModelSessionDetail({ projections, detailStyle, t }: ModelSessionDetailProps) {
  const selection = projections.sessionModel as SessionModelProjection | null | undefined
  if (selection == null) return null
  const label = t('summary.model')
  const value = `${selection.model} · ${selection.provider}`
  return (
    <div className={detailStyle.rowClassName} title={`${label}: ${value}`}>
      <CodePilotIcon name={detailStyle.iconNames.model} size={14} />
      <span className={detailStyle.labelClassName}>{label}</span>
      <span className={detailStyle.valueClassName}>{value}</span>
    </div>
  )
}
