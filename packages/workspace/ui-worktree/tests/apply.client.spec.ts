import { describe, expect, it, vi } from 'vitest'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'

describe('ui-worktree client plugin', () => {
  it('wires native open and composer insertion through existing client services', async () => {
    const setDraft = vi.fn()
    const input = {
      state: { getSnapshot: () => ({ draft: 'Inspect' }) },
      setDraft,
    }
    const conversation = { input: { for: vi.fn(() => input) } }
    const actx = { get: vi.fn(() => conversation) }
    const openPath = vi.fn(() => Promise.resolve())
    const rpcCall = vi.fn(() => Promise.resolve({ ok: true, value: {} }))
    const registrations: Array<{ id?: string; inject?: () => Record<string, unknown> }> = []
    const ctx = {
      effect: (install: () => unknown) => install(),
      locale: { register: vi.fn(() => () => {}) },
      sessions: { scope: vi.fn(() => actx) },
      workspaces: { openPath },
      layout: { openRightSidebar: vi.fn(), closeRightSidebar: vi.fn() },
      get: (name: string) => name === 'connection' ? { rpc: { call: rpcCall } } : undefined,
      slots: {
        inject: (_name: string, install: () => unknown) => install(),
        register: (options: { id?: string; inject?: () => Record<string, unknown> }) => {
          registrations.push(options)
          return () => {}
        },
      },
    } as unknown as ClientContext

    apply(ctx)
    const panel = registrations.find(entry => entry.id === 'worktree-panel')?.inject?.()
    expect(panel).toBeDefined()
    const addPathToInput = panel?.addPathToInput as ((sessionId: string, path: string) => void)
    const open = panel?.openPath as ((path: string) => Promise<void>)
    addPathToInput('s1', 'src/main.ts')
    await open('/workspace/src/main.ts')

    expect(setDraft).toHaveBeenCalledWith('Inspect @src/main.ts ')
    expect(openPath).toHaveBeenCalledWith('/workspace/src/main.ts')
    expect(inject).toEqual(['slots', 'locale', 'connection', 'layout', 'sessions', 'workspaces', 'conversation'])
  })
})
