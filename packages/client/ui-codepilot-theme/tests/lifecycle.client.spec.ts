// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'

const systemLight = {
  preference: 'system',
  active: { id: 'light', colorScheme: 'light', tokens: {} },
  themes: [],
  revision: 0,
} as const

function context(snapshot = systemLight): {
  ctx: Parameters<typeof apply>[0]
  emitTheme: (next: unknown) => void
  dispose: () => void
} {
  const disposers: Array<() => void> = []
  let themeListener: ((next: never) => void) | undefined
  return {
    ctx: {
      theme: { getTheme: () => snapshot },
      on(event: string, listener: (next: never) => void) {
        if (event === 'theme/change') themeListener = listener
        return () => { themeListener = undefined }
      },
      effect(effect: () => (() => void)) {
        disposers.push(effect())
        return () => {}
      },
    } as never,
    emitTheme(next) { themeListener?.(next as never) },
    dispose() {
      for (const disposer of disposers.reverse()) disposer()
    },
  }
}

function cssBlock(source: string, selector: string): string {
  const selectorIndex = source.indexOf(selector)
  const start = source.indexOf('{', selectorIndex) + 1
  let depth = 1
  let end = start
  while (depth > 0 && end < source.length) {
    if (source[end] === '{') depth += 1
    if (source[end] === '}') depth -= 1
    end += 1
  }
  return source.slice(start, end - 1)
}

function paletteTokens(block: string): string[] {
  return [...block.matchAll(/^\s*(--(?:dsw-alias|dsw-specific|dsw-shadow)-[^:]+):/gm)]
    .map(match => match[1]!)
}

function pilotPaletteTokens(block: string): string[] {
  const palette = new RegExp([
    '^--pilot-(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?',
    '|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?',
    '|text-(?:primary|secondary|muted|caption)|accent(?:-foreground)?',
    '|border|input|ring|sidebar|shadow-diffuse',
    '|platform-surface-(?:window|sidebar|popover))$',
  ].join(''))
  return [...block.matchAll(/^\s*(--pilot-[^:]+):/gm)]
    .map(match => match[1]!)
    .filter(token => palette.test(token))
}

afterEach(() => {
  document.documentElement.removeAttribute('data-codepilot-theme')
  Reflect.deleteProperty(globalThis, 'pilotHarness')
})

describe('CodePilot theme lifecycle', () => {
  it('marks the document while active and restores the previous state on unload', () => {
    const fixture = context()
    apply(fixture.ctx)
    expect(document.documentElement.getAttribute('data-codepilot-theme')).toBe('true')
    fixture.dispose()
    expect(document.documentElement.hasAttribute('data-codepilot-theme')).toBe(false)
  })

  it('restores a marker owned by an outer theme host', () => {
    document.documentElement.setAttribute('data-codepilot-theme', 'preview')
    const fixture = context()
    apply(fixture.ctx)
    fixture.dispose()
    expect(document.documentElement.getAttribute('data-codepilot-theme')).toBe('preview')
  })

  it('keeps the desktop native material on the selected theme source', () => {
    const setThemeSource = vi.fn().mockResolvedValue(true)
    Object.defineProperty(globalThis, 'pilotHarness', { configurable: true, value: { setThemeSource } })
    const fixture = context()
    apply(fixture.ctx)

    expect(setThemeSource).toHaveBeenLastCalledWith('system')
    fixture.emitTheme({ ...systemLight, preference: 'dark', active: { ...systemLight.active, id: 'dark', colorScheme: 'dark' } })
    expect(setThemeSource).toHaveBeenLastCalledWith('dark')
    fixture.emitTheme({ ...systemLight, preference: 'custom', active: { ...systemLight.active, id: 'custom', colorScheme: 'dark' } })
    expect(setThemeSource).toHaveBeenLastCalledWith('dark')
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

  it('pairs every Pilot and Harness semantic palette token with a dark value', () => {
    const packageRoot = resolve(process.cwd(), 'packages/client/ui-codepilot-theme')
    const themeCss = readFileSync(resolve(packageRoot, 'src/client/theme.module.css'), 'utf8')
    const lightTokens = paletteTokens(cssBlock(themeCss, 'html[data-codepilot-theme] body {'))
    const darkTokens = new Set(paletteTokens(cssBlock(themeCss, 'html[data-codepilot-theme] body[data-ds-dark-theme] {')))
    const pilotLightTokens = pilotPaletteTokens(cssBlock(themeCss, 'html[data-codepilot-theme] {'))
    const pilotDarkTokens = new Set(pilotPaletteTokens(cssBlock(themeCss, 'html[data-codepilot-theme] body[data-ds-dark-theme] {')))

    expect(lightTokens.filter(token => !darkTokens.has(token))).toEqual([])
    expect(pilotLightTokens.filter(token => !pilotDarkTokens.has(token))).toEqual([])
    expect(themeCss).toContain('--pilot-shadow-diffuse: 0 12px 40px -8px rgb(0 0 0 / 45%)')
    expect(themeCss).toContain("[data-pilot-platform='darwin'] body[data-ds-dark-theme]")
    expect(themeCss).toContain('body[data-ds-dark-theme] ::selection')
  })
})
