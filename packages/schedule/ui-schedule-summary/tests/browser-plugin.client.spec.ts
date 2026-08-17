import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'

/** Boot the browser half over disposal-aware locale and slot ledgers. */
async function bench() {
  const ctx = new Context()
  const dictionaries = new Set<string>()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'sidebar.workspaces.session.detail': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  ctx.provide('locale', {
    register: (namespace: string) => {
      dictionaries.add(namespace)
      return () => { dictionaries.delete(namespace) }
    },
  } as never)
  ctx.provide('connection', { rpc: { call: () => Promise.resolve({ ok: true, value: {} }) } } as never)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const entryIds = () => ctx.slots.entries('sidebar.workspaces.session.detail').map(entry => entry.options.id)
  return { entryIds, dictionaries, fiber }
}

describe('Schedule summary browser half', () => {
  it('registers its optional detail row and removes every contribution on disposal', async () => {
    const value = await bench()
    expect(value.entryIds()).toEqual(['schedule-summary'])
    expect(value.dictionaries).toEqual(new Set(['scheduleSummary']))
    await value.fiber.dispose()
    expect(value.entryIds()).toEqual([])
    expect(value.dictionaries.size).toBe(0)
  })
})
