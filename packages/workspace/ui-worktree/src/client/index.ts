/** Client half: session-header toggle plus a docked right file-tree sidebar. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { WorktreePanelController } from './controller.ts'
import { appendWorktreePath } from './draft.ts'
import { en, NS, zh, type WorktreeKey } from './locales.ts'
import { WorktreePanel } from './WorktreePanel.tsx'
import { WorktreeHeaderToggle } from './WorktreeHeaderToggle.tsx'
import { WorktreeSessionDetail } from './WorktreeSessionDetail.tsx'
import {
  WORKTREE_CHANNEL,
  WORKTREE_LIST_ENDPOINT,
  WORKTREE_MUTATE_ENDPOINT,
  type WorktreeListing,
  type WorktreeListRequest,
  type WorktreeMutation,
  type WorktreeMutationResult,
} from '../types.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { worktree: WorktreeKey }
}

export const inject = ['slots', 'locale', 'connection', 'layout', 'sessions', 'workspaces', 'conversation']

export function apply(ctx: ClientContext): void {
  const connection = ctx.get('connection') as ConnectionHandle
  const call = async <T>(endpoint: string, payload: unknown, signal?: AbortSignal): Promise<T> => {
    const result = await connection.rpc.call(WORKTREE_CHANNEL, endpoint, payload, signal)
    if (!result.ok) throw new Error(result.error.message)
    return result.value as T
  }
  const loadWorktree = (request: WorktreeListRequest, signal?: AbortSignal) =>
    call<WorktreeListing>(WORKTREE_LIST_ENDPOINT, request, signal)
  const mutateWorktree = (mutation: WorktreeMutation, signal?: AbortSignal) =>
    call<WorktreeMutationResult>(WORKTREE_MUTATE_ENDPOINT, mutation, signal)
  const controller = new WorktreePanelController((open) => {
    if (open) ctx.layout.openRightSidebar?.()
    else ctx.layout.closeRightSidebar?.()
  })
  ctx.effect(() => () => { controller.close() }, 'ui-worktree: release dock width on dispose')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-worktree: dictionaries')
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'worktree-toggle',
    order: 20,
    locale: NS,
    inject: () => ({ controller }),
  }, WorktreeHeaderToggle))
  ctx.slots.inject('shell.right-sidebar', () => ctx.slots.register({
    name: 'shell.right-sidebar',
    id: 'worktree-panel',
    order: 20,
    locale: NS,
    inject: () => ({
      controller,
      loadWorktree,
      mutateWorktree,
      openPath: (path: string) => ctx.workspaces.openPath(path),
      addPathToInput: (sessionId: SessionId, path: string) => {
        const actx = ctx.sessions.scope(sessionId)
        if (actx === undefined) throw new Error(`worktree: session "${sessionId}" resolved no scope`)
        const conversation = actx.get('conversation')
        if (conversation === undefined) throw new Error('worktree: conversation service unavailable')
        const input = conversation.input.for(actx)
        input.setDraft(appendWorktreePath(input.state.getSnapshot().draft, path))
      },
    }),
  }, WorktreePanel))
  ctx.slots.inject('sidebar.workspaces.session.detail', () => ctx.slots.register({
    name: 'sidebar.workspaces.session.detail',
    id: 'worktree-branch',
    order: 10,
    locale: NS,
    inject: () => ({
      loadBranch: async (workspaceId: string, signal?: AbortSignal) =>
        (await loadWorktree({ workspaceId, relative: '', summary: 'branch' }, signal)).branch,
    }),
  }, WorktreeSessionDetail))
}
