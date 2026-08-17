// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/client/index.ts'

afterEach(() => { document.documentElement.removeAttribute('data-codepilot-theme') })

describe('CodePilot theme lifecycle', () => {
  it('marks the document while active and restores the previous state on unload', () => {
    let dispose: (() => void) | undefined
    apply({
      effect(effect: () => (() => void)) {
        dispose = effect()
        return () => {}
      },
    } as never)
    expect(document.documentElement.getAttribute('data-codepilot-theme')).toBe('true')
    dispose?.()
    expect(document.documentElement.hasAttribute('data-codepilot-theme')).toBe(false)
  })

  it('restores a marker owned by an outer theme host', () => {
    document.documentElement.setAttribute('data-codepilot-theme', 'preview')
    let dispose: (() => void) | undefined
    apply({
      effect(effect: () => (() => void)) {
        dispose = effect()
        return () => {}
      },
    } as never)
    dispose?.()
    expect(document.documentElement.getAttribute('data-codepilot-theme')).toBe('preview')
  })

  it('embeds one plugin-owned product mark for every brand seat', () => {
    const packageRoot = resolve(process.cwd(), 'packages/client/ui-codepilot-theme')
    const brandCss = readFileSync(resolve(packageRoot, 'src/client/brand-icon.module.css'), 'utf8')
    const themeCss = readFileSync(resolve(packageRoot, 'src/client/theme.module.css'), 'utf8')

    expect(brandCss).toContain("--pilot-brand-icon: url('data:image/png;base64,")
    expect(themeCss).not.toContain('pilot-monolith')
    for (const seat of ['rail', 'wordmark', 'hero', 'about']) {
      expect(themeCss).toContain(`data-pilot-brand-mark='${seat}'`)
    }
    expect(themeCss).not.toContain("[class*='_")
    expect(themeCss).toContain('[data-sidebar-collapsed] [data-pilot-sidebar-toggle]')
    expect(themeCss).toMatch(/\[data-sidebar-collapsed\][^{]+\[data-pilot-sidebar-toggle\][^{]+\{\s*width: 36px;\s*height: 36px;/)
  })
})
