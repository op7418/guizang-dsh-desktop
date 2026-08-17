/** Git branch contribution for the Workspace browser's Session hover summary. */

import { useEffect, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CodePilotIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import type { NS } from './locales.ts'

/** Props derived from the Workspace Session-detail slot and locale seat. */
export type WorktreeSessionDetailProps = PropsRuntime<'sidebar.workspaces.session.detail'>
  & PropsLocale<typeof NS>
  & { loadBranch: (workspaceId: string, signal?: AbortSignal) => Promise<string | undefined> }

/**
 * Read the plugin-owned branch summary; failures leave the optional row absent.
 * @param props - Workspace facts, owner presentation values, and locale seat.
 * @returns The optional branch row.
 */
export function WorktreeSessionDetail({ workspaceId, detailStyle, loadBranch, t }: WorktreeSessionDetailProps) {
  const [branch, setBranch] = useState<string | null>(null)

  useEffect(() => {
    setBranch(null)
    if (workspaceId === undefined) return
    const controller = new AbortController()
    void loadBranch(workspaceId, controller.signal)
      .then((value) => { setBranch(value ?? null) })
      .catch(() => undefined)
    return () => { controller.abort() }
  }, [loadBranch, workspaceId])

  if (branch === null) return null
  const label = t('summary.branch')
  return (
    <div className={detailStyle.rowClassName} title={`${label}: ${branch}`}>
      <CodePilotIcon name={detailStyle.iconNames.branch} size={14} />
      <span className={detailStyle.labelClassName}>{label}</span>
      <span className={detailStyle.valueClassName}>{branch}</span>
    </div>
  )
}
