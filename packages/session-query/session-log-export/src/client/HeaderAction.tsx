import type { ReactNode } from 'react'
import { IconDownloadOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { SessionLogDownloadDialog, type SessionLogDownloadDialogProps } from './Dialog.tsx'
import css from './HeaderAction.module.css'

/**
 * Render the Trajectory export action and its shared result dialog.
 * @param props - Session runtime, download controller, and localized dialog copy.
 * @returns the Trajectory action and Session-scoped dialog.
 */
export function SessionLogDownloadTrajectoryAction(props: SessionLogDownloadDialogProps): ReactNode {
  const { sessionId, useSessionLogDownload, request } = props
  const entry = useSessionLogDownload(state => state.bySession[String(sessionId)])
  const busy = entry?.status === 'downloading'

  return (
    <>
      <button
        type="button"
        className={css.sessionLogButton}
        disabled={busy}
        aria-busy={busy}
        aria-label={busy ? props.t('action.exporting') : props.t('action.export')}
        title={busy ? props.t('action.exporting') : props.t('action.export')}
        onClick={() => { void request(sessionId) }}
      >
        <IconDownloadOutline16 size={14} />
        <span>{busy ? props.t('action.exporting') : props.t('action.export')}</span>
      </button>
      <SessionLogDownloadDialog {...props} />
    </>
  )
}
