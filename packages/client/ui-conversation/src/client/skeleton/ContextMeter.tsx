/** Composer context entry: a ring beside the send button fed by the optional
 * `contextPressure` projection. Its Beautiful UI popover keeps the heuristic
 * breakdown and built-in session statistics in one place instead of creating
 * another information strip below the composer. */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { UseProjection } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { MaybeSnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the `contextPressure` / `contextBreakdown` projection key merges.
import type {} from '@deepseek-ai/dsh-token-meter/client'
import { CodePilotIcon, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComposerBarProps } from '../contract/slots.ts'
import { StatsLine, contextOccupancy, formatTokens } from '../chat/StatsLine.tsx'
import css from './ContextMeter.module.css'

/**
 * Marker the localized occupancy sentence is split on, so the panel headline
 * keeps the reading in its own tone while each locale still owns the word
 * order (`45% of context used` / `上下文已用 45%`).
 */
const READING_SLOT = '\u0000'

/** Panel legend rows, in bar-segment order; each color class carries the shared swatch/segment tint. */
const ROWS = [
  { key: 'systemTokens', label: 'context.system', color: css.colorSystem },
  { key: 'toolsTokens', label: 'context.tools', color: css.colorTools },
  { key: 'messageTokens', label: 'context.messages', color: css.colorMessages },
] as const

export interface ContextMeterProps {
  useSession: MaybeSnapshotSelectorHook<ConversationSnapshot>
  useProjection: UseProjection
  /** Extension entries from the former composer dock, now grouped here. */
  contextItems?: ReactNode
  /** The owning bar's locale seat, passed down as a plain prop. */
  t: ComposerBarProps['t']
}

export function ContextMeter({ useSession, useProjection, contextItems, t }: ContextMeterProps) {
  const pressure = useProjection('contextPressure')
  const breakdown = useProjection('contextBreakdown')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const context = contextOccupancy(pressure)

  // Outside click / Escape close, one document listener while open (Menu's pattern).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent): void => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target) === true) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const percent = context?.percent ?? 0
  const reading = context === null ? null : `${percent}%`
  const [headBefore = '', headAfter = ''] = t('context.aria', { percent: READING_SLOT })
    .split(READING_SLOT)
    .map(part => part.trim())

  // The bar's overall length stays the provider-exact percent; the heuristic
  // breakdown only proportions its colored parts. A zero-width part is dropped
  // instead of rendered: `.segment`'s min-width keeps a hairline part visible,
  // which at 0% occupancy would draw a filled bar over an empty context.
  const breakdownTotal = breakdown === undefined
    ? 0
    : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens
  const parts = breakdown === undefined || breakdownTotal === 0
    ? [{ key: 'total', color: undefined, width: percent }]
    : ROWS.map(row => ({ key: row.key, color: row.color, width: percent * breakdown[row.key] / breakdownTotal }))
  const segments = parts.filter(part => part.width > 0)

  return (
    <span ref={rootRef} className={css.root}>
      <Tooltip
        label={reading === null ? t('context.details') : t('context.aria', { percent: reading })}
        side="top"
        delayMs={200}
        disabled={open}
      >
        <button
          type="button"
          className={css.trigger}
          aria-label={reading === null ? t('context.details') : t('context.aria', { percent: reading })}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-beautifului="context-trigger"
          onClick={() => { setOpen(!open) }}
        >
          <CodePilotIcon name="context" size={13} />
          {reading !== null && <span className={css.triggerReading}>{reading}</span>}
        </button>
      </Tooltip>
      {open && (
        <div
          className={css.panel}
          role="dialog"
          aria-label={t('context.details')}
          data-beautifului="context-card"
        >
          {context === null ? (
            <div className={css.title}>{t('context.details')}</div>
          ) : (
            <>
              <div className={css.header}>
                {/* Empty sides collapse through `.headline:empty` so the locale that
                    needs no leading (or trailing) text spends no header gap. */}
                <span className={css.headline}>{headBefore}</span>
                <span className={css.percent}>{reading}</span>
                <span className={css.headline}>{headAfter}</span>
                <span className={css.figures}>
                  {`~${formatTokens(context.usedTokens)} / ${formatTokens(context.contextWindow)}`}
                </span>
              </div>
              <div className={css.bar}>
                {segments.map(segment => (
                  <div
                    key={segment.key}
                    className={segment.color === undefined ? css.segment : `${css.segment} ${segment.color}`}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>
              {breakdown !== undefined && (
                <dl className={css.rows}>
                  {ROWS.map(row => (
                    <div key={row.key} className={css.row}>
                      <dt>
                        <span className={`${css.swatch} ${row.color}`} aria-hidden />
                        {t(row.label)}
                      </dt>
                      <dd>{`~${formatTokens(breakdown[row.key])}`}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
          <div className={css.divider} />
          <StatsLine useSession={useSession} useProjection={useProjection} t={t} display="context" />
          {contextItems}
        </div>
      )}
    </span>
  )
}
