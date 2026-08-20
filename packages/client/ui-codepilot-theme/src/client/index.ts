/** Client-owned CodePilot theme activation and reversible teardown marker. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ThemeSnapshot } from '@deepseek-ai/dsh-client-ui-theme/client'
import './brand-icon.module.css'
import './theme.module.css'

export const inject = ['theme']

interface PilotDesktopThemeBridge {
  setThemeSource?: (source: 'system' | 'light' | 'dark') => Promise<boolean>
}

function nativeThemeSource(snapshot: ThemeSnapshot): 'system' | 'light' | 'dark' {
  // Custom theme ids can still appear from the runtime registry even though
  // only built-in preferences cross the persisted settings interface.
  const preference: unknown = snapshot.preference
  if (preference === 'system' || preference === 'light' || preference === 'dark') return preference
  return snapshot.active.colorScheme
}

function syncNativeTheme(snapshot: ThemeSnapshot): void {
  const bridge = (globalThis as { pilotHarness?: PilotDesktopThemeBridge }).pilotHarness
  if (bridge?.setThemeSource === undefined) return
  void bridge.setThemeSource(nativeThemeSource(snapshot)).catch(() => undefined)
}

export function apply(ctx: ClientContext): void {
  const root = document.documentElement
  const previous = root.getAttribute('data-codepilot-theme')
  root.setAttribute('data-codepilot-theme', 'true')
  ctx.effect(() => () => {
    if (previous === null) root.removeAttribute('data-codepilot-theme')
    else root.setAttribute('data-codepilot-theme', previous)
  }, 'ui-codepilot-theme: activation marker')
  ctx.effect(() => {
    syncNativeTheme(ctx.theme.getTheme())
    return ctx.on('theme/change', syncNativeTheme)
  }, 'ui-codepilot-theme: desktop native palette sync')
}
