import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'

/** Boot the browser half over disposal-aware locale and slot ledgers. */
async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
      'shell.right-sidebar': { kind: 'list', scope: 'root' },
      'sidebar.workspaces.session.detail': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  ctx.provide('locale', { register: () => () => {} } as never)
  ctx.provide('sessions', {} as never)
  ctx.provide('workspaces', {} as never)
  ctx.provide('conversation', {} as never)
  ctx.provide('layout', { openRightSidebar: () => {}, closeRightSidebar: () => {} } as never)
  ctx.provide('connection', { rpc: { call: () => Promise.resolve({ ok: true, value: {} }) } } as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const entryIds = () => [
    ...ctx.slots.entries('conversation.session.header.utilities'),
    ...ctx.slots.entries('shell.right-sidebar'),
    ...ctx.slots.entries('sidebar.workspaces.session.detail'),
  ].map(entry => entry.options.id)
  return { entryIds, fiber }
}

describe('Worktree browser half', () => {
  it('registers its toggle, panel, and branch detail and removes them on disposal', async () => {
    const value = await bench()
    expect(value.entryIds()).toEqual(['worktree-toggle', 'worktree-panel', 'worktree-branch'])
    await value.fiber.dispose()
    expect(value.entryIds()).toEqual([])
  })
})
