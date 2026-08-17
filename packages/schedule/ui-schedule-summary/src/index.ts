/** Host half: cached, read-only Schedule summaries over loopback-only RPC. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-persistence'
import { foldScheduleEvents } from '@deepseek-ai/dsh-schedule'
import {
  SCHEDULE_SUMMARY_CHANNEL,
  SCHEDULE_SUMMARY_GET_ENDPOINT,
  type ScheduleSummary,
  type ScheduleSummaryRequest,
} from './types.ts'

const CACHE_TTL_MS = 15_000
const MAX_CACHE_ENTRIES = 256

function pruneCache(
  cache: Map<string, { expiresAt: number; value: ScheduleSummary }>,
  now: number,
  maximum = MAX_CACHE_ENTRIES,
): void {
  for (const [sessionId, cached] of cache) {
    if (cached.expiresAt <= now) cache.delete(sessionId)
  }
  while (cache.size > maximum) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

function request(value: unknown): ScheduleSummaryRequest {
  if (value === null || typeof value !== 'object') throw new Error('invalid request')
  const sessionId = (value as Record<string, unknown>).sessionId
  if (typeof sessionId !== 'string' || sessionId.trim() === '') throw new Error('sessionId is required')
  return { sessionId }
}

function isAborted(signal: AbortSignal): boolean {
  return signal.aborted
}

async function inspectSummary(ctx: Context, sessionId: string): Promise<ScheduleSummary> {
  const inspected = await ctx.sessionPersistence.inspect(SessionId(sessionId))
  const folded = foldScheduleEvents(inspected.events, inspected.meta.seedLength ?? 0)
  const next = folded.active
    .map(record => record.scheduledAt)
    .sort((left, right) => Date.parse(left) - Date.parse(right))[0]
  return {
    activeCount: folded.active.length,
    ...(next === undefined ? {} : { nextScheduledAt: next }),
  }
}

/** Services required by the read-only summary RPC. */
export const inject = ['connection', 'sessionPersistence']

/** Register a cached, loopback-only summary RPC without waking cold Sessions. */
export function apply(ctx: Context): void {
  const cache = new Map<string, { expiresAt: number; value: ScheduleSummary }>()
  const pending = new Map<string, Promise<ScheduleSummary>>()

  ctx.effect(() => ctx.on('session/event', (session, event) => {
    if (event.type === 'schedule/change') cache.delete(String(session.id))
  }), 'ui-schedule-summary: invalidate changed Sessions')

  ctx.effect(() => ctx.connection.rpc.handle(SCHEDULE_SUMMARY_CHANNEL, async (endpoint, payload, signal) => {
    if (endpoint !== SCHEDULE_SUMMARY_GET_ENDPOINT) {
      return { ok: false, error: { code: 'bad-request', message: 'unknown schedule summary operation', details: { issues: [] } } }
    }
    try {
      const { sessionId } = request(payload)
      if (isAborted(signal)) {
        return { ok: false, error: { code: 'cancelled', message: 'request cancelled', details: {} } }
      }
      const now = Date.now()
      pruneCache(cache, now)
      const cached = cache.get(sessionId)
      if (cached !== undefined) {
        // Refresh insertion order so the bounded map behaves as a small LRU.
        cache.delete(sessionId)
        cache.set(sessionId, cached)
        return { ok: true, value: cached.value }
      }
      let task = pending.get(sessionId)
      if (task === undefined) {
        task = inspectSummary(ctx, sessionId)
        pending.set(sessionId, task)
      }
      const value = await task.finally(() => { pending.delete(sessionId) })
      pruneCache(cache, Date.now(), MAX_CACHE_ENTRIES - 1)
      cache.set(sessionId, { expiresAt: Date.now() + CACHE_TTL_MS, value })
      if (isAborted(signal)) {
        return { ok: false, error: { code: 'cancelled', message: 'request cancelled', details: {} } }
      }
      return { ok: true, value }
    } catch (error) {
      ctx.logger.warn(`ui-schedule-summary: Schedule summary read failed: ${String(error)}`)
      return { ok: false, error: { code: 'internal', message: 'schedule summary unavailable', details: {} } }
    }
  }, { authority: 'loopback' }), 'ui-schedule-summary: loopback summary RPC')
}
