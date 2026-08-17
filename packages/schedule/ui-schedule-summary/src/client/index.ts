/** Client half: optional reminder row in the Workspace Session hover summary. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { ScheduleSessionDetail } from './ScheduleSessionDetail.tsx'
import { en, NS, zh, type ScheduleSummaryKey } from './locales.ts'
import {
  SCHEDULE_SUMMARY_CHANNEL,
  SCHEDULE_SUMMARY_GET_ENDPOINT,
  type ScheduleSummary,
} from '../types.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { scheduleSummary: ScheduleSummaryKey }
}

/** Services required by the browser contribution. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Register the locale and optional reminder detail row.
 * @param ctx - Browser plugin context carrying slots and locale services.
 */
export function apply(ctx: ClientContext): void {
  const connection = ctx.get('connection') as ConnectionHandle
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-schedule-summary: dictionaries')
  ctx.slots.inject('sidebar.workspaces.session.detail', () => ctx.slots.register({
    name: 'sidebar.workspaces.session.detail',
    id: 'schedule-summary',
    order: 30,
    locale: NS,
    inject: () => ({
      loadSchedule: async (sessionId: string, signal?: AbortSignal): Promise<ScheduleSummary> => {
        const result = await connection.rpc.call(
          SCHEDULE_SUMMARY_CHANNEL,
          SCHEDULE_SUMMARY_GET_ENDPOINT,
          { sessionId },
          signal,
        )
        if (!result.ok) throw new Error(result.error.message)
        return result.value as ScheduleSummary
      },
    }),
  }, ScheduleSessionDetail))
}
