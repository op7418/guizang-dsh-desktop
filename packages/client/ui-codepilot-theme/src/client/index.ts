/** Client-owned CodePilot theme activation and reversible teardown marker. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import './brand-icon.module.css'
import './theme.module.css'

export const inject: string[] = []

export function apply(ctx: ClientContext): void {
  const root = document.documentElement
  const previous = root.getAttribute('data-codepilot-theme')
  root.setAttribute('data-codepilot-theme', 'true')
  ctx.effect(() => () => {
    if (previous === null) root.removeAttribute('data-codepilot-theme')
    else root.setAttribute('data-codepilot-theme', previous)
  }, 'ui-codepilot-theme: activation marker')
}
