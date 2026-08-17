import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, ConnectionRpcHandlerOptions } from '@deepseek-ai/dsh-client-connection'
import { ScheduleId, createAfterScheduleRecord } from '@deepseek-ai/dsh-schedule'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { apply, inject } from '../src/index.ts'
import { SCHEDULE_SUMMARY_GET_ENDPOINT } from '../src/types.ts'

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

function scheduleEvent(id: string, seq: number): SessionEvent {
  return {
    type: 'schedule/change', seq, time: seq,
    data: {
      version: 1,
      operation: 'create',
      schedule: createAfterScheduleRecord(ScheduleId(id), `Reminder ${id}`, 60, Date.parse('2030-01-01T00:00:00.000Z')),
    },
  }
}

async function bench(events: readonly SessionEvent[], seedLength = 0) {
  const ctx = new Context()
  contexts.push(ctx)
  let handler: ConnectionRpcHandler | undefined
  let options: ConnectionRpcHandlerOptions | undefined
  const inspect = vi.fn(async () => ({ meta: { seedLength }, events }))
  ctx.provide('connection', {
    rpc: {
      handle: (_channel: string, next: ConnectionRpcHandler, nextOptions: ConnectionRpcHandlerOptions) => {
        handler = next
        options = nextOptions
        return async () => { handler = undefined }
      },
    },
  } as never)
  ctx.provide('sessionPersistence', { inspect } as never)
  await ctx.plugin({ inject, apply }).await()
  return {
    call: (endpoint: string, payload: unknown) => handler!(endpoint, payload, new AbortController().signal),
    inspect,
    options: () => options,
  }
}

describe('Schedule summary Host RPC', () => {
  it('uses the loopback trust fence and returns the nearest active reminder without waking the Session', async () => {
    const host = await bench([scheduleEvent('one', 0), scheduleEvent('two', 1)])
    const result = await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, { sessionId: 's1' })
    expect(host.options()).toEqual({ authority: 'loopback' })
    expect(result).toEqual({
      ok: true,
      value: { activeCount: 2, nextScheduledAt: '2030-01-01T00:01:00.000Z' },
    })
    expect(host.inspect).toHaveBeenCalledOnce()
  })

  it('excludes inherited fork reminders and caches repeated hover reads', async () => {
    const host = await bench([scheduleEvent('parent', 0)], 1)
    expect(await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, { sessionId: 'child' }))
      .toEqual({ ok: true, value: { activeCount: 0 } })
    expect(await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, { sessionId: 'child' }))
      .toEqual({ ok: true, value: { activeCount: 0 } })
    expect(host.inspect).toHaveBeenCalledOnce()
  })

  it('bounds hover summaries and evicts the least recently used Session', async () => {
    const host = await bench([])
    for (let index = 0; index < 257; index += 1) {
      expect(await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, { sessionId: `s${index}` }))
        .toEqual({ ok: true, value: { activeCount: 0 } })
    }
    expect(host.inspect).toHaveBeenCalledTimes(257)

    await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, { sessionId: 's0' })
    expect(host.inspect).toHaveBeenCalledTimes(258)
    await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, { sessionId: 's256' })
    expect(host.inspect).toHaveBeenCalledTimes(258)
  })

  it('rejects malformed or unknown RPC operations without reading persistence', async () => {
    const host = await bench([])
    expect(await host.call('delete', { sessionId: 's1' }))
      .toMatchObject({ ok: false, error: { code: 'bad-request' } })
    expect(await host.call(SCHEDULE_SUMMARY_GET_ENDPOINT, {}))
      .toMatchObject({ ok: false, error: { code: 'internal', message: 'schedule summary unavailable' } })
    expect(host.inspect).not.toHaveBeenCalled()
  })
})
