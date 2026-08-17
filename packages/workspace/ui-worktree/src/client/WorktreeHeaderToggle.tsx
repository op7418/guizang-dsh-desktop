import { useSyncExternalStore } from 'react'
import { CodePilotIcon, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorktreePanelController } from './controller.ts'
import type { NS } from './locales.ts'
import css from './WorktreeHeaderToggle.module.css'

export type WorktreeHeaderToggleProps = PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<typeof NS>
  & { controller: WorktreePanelController }

/** Session-level file tree control aligned with the Conversation/Trajectory tabs. */
export function WorktreeHeaderToggle({ controller, t }: WorktreeHeaderToggleProps) {
  const open = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot).open
  return (
    <Tooltip label={t('toggle')} delayMs={500}>
      <button
        type="button"
        className={css.button}
        aria-label={t('toggle')}
        aria-pressed={open}
        data-beautifului="header-file-toggle"
        onClick={controller.toggle}
      >
        <CodePilotIcon name="folder_open" size={14} />
        <span>{t('toggle')}</span>
      </button>
    </Tooltip>
  )
}
