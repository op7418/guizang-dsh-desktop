import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode } from 'react'
import {
  CodePilotIcon, IconChevronDownOutline14, IconChevronRightOutline14, Menu, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { resolveWorkspacePath, type SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  type WorktreeListing,
  type WorktreeListRequest,
  type WorktreeMutation,
  type WorktreeMutationResult,
} from '../types.ts'
import type { WorktreePanelController } from './controller.ts'
import type { NS } from './locales.ts'
import css from './WorktreePanel.module.css'

interface PendingCreate { readonly kind: 'file' | 'directory'; readonly parent: string }
interface PendingRename { readonly path: string; readonly current: string }

export type WorktreePanelProps = PropsRuntime<'shell.right-sidebar'>
  & PropsLocale<typeof NS>
  & {
    controller: WorktreePanelController
    loadWorktree: (request: WorktreeListRequest, signal?: AbortSignal) => Promise<WorktreeListing>
    mutateWorktree: (mutation: WorktreeMutation, signal?: AbortSignal) => Promise<WorktreeMutationResult>
    openPath: (path: string) => Promise<void>
    addPathToInput: (sessionId: SessionId, path: string) => void
  }

export function WorktreePanel({
  controller, loadWorktree, mutateWorktree, openPath, addPathToInput, useSessions, useWorkspaces, t,
}: WorktreePanelProps) {
  const open = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot).open
  const currentSession = useSessions(state => state.current)
  const targetId = useWorkspaces((state): string | undefined => {
    const workspace = currentSession === undefined
      ? state.items.find(item => item.workspaceId === state.recentWorkspaceId)
      : state.items.find(item => item.sessionIds.includes(currentSession))
    return workspace?.workspaceId
  })
  const targetTitle = useWorkspaces(state => state.items.find(item => item.workspaceId === targetId)?.title)
  const targetPath = useWorkspaces(state => state.items.find(item => item.workspaceId === targetId)?.path)
  const [listings, setListings] = useState<ReadonlyMap<string, WorktreeListing>>(new Map())
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [create, setCreate] = useState<PendingCreate | null>(null)
  const [renaming, setRenaming] = useState<PendingRename | null>(null)
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const load = useCallback(async (relative: string) => {
    if (targetId === undefined) return
    setLoading(current => new Set(current).add(relative))
    setError(null)
    try {
      const listing = await loadWorktree({ workspaceId: targetId, relative })
      setListings(current => new Map(current).set(relative, listing))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading((current) => {
        const next = new Set(current)
        next.delete(relative)
        return next
      })
    }
  }, [loadWorktree, targetId])

  useEffect(() => {
    setListings(new Map())
    setExpanded(new Set())
    setCreate(null)
    setRenaming(null)
    setMenuPath(null)
    setError(null)
    if (open && targetId !== undefined) void load('')
  }, [open, targetId, load])

  const refresh = useCallback(() => {
    setListings(new Map())
    setExpanded(new Set())
    void load('')
  }, [load])

  const toggleDirectory = useCallback((path: string) => {
    const nextExpanded = new Set(expanded)
    if (nextExpanded.has(path)) nextExpanded.delete(path)
    else {
      nextExpanded.add(path)
      if (!listings.has(path)) void load(path)
    }
    setExpanded(nextExpanded)
  }, [expanded, listings, load])

  const mutate = useCallback(async (action: WorktreeMutation, refreshParent: string) => {
    setError(null)
    await mutateWorktree(action)
    setCreate(null)
    setRenaming(null)
    setDraft('')
    await Promise.all([load(refreshParent), refreshParent === '' ? Promise.resolve() : load('')])
  }, [load, mutateWorktree])

  const submitCreate = (event: FormEvent) => {
    event.preventDefault()
    if (targetId === undefined || create === null || draft.trim() === '') return
    void mutate({
      operation: create.kind === 'file' ? 'create-file' : 'create-directory',
      workspaceId: targetId,
      parent: create.parent,
      name: draft,
    }, create.parent).catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : String(reason)) })
  }

  const submitRename = (event: FormEvent) => {
    event.preventDefault()
    if (targetId === undefined || renaming === null || draft.trim() === '') return
    const parent = renaming.path.includes('/') ? renaming.path.slice(0, renaming.path.lastIndexOf('/')) : ''
    void mutate({ operation: 'rename', workspaceId: targetId, path: renaming.path, name: draft }, parent)
      .catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : String(reason)) })
  }

  const cancelEditor = () => { setCreate(null); setRenaming(null); setDraft('') }
  const beginRename = useCallback((path: string, current: string) => {
    setMenuPath(null)
    setRenaming({ path, current })
    setDraft(current)
  }, [])
  const openEntry = useCallback((path: string) => {
    if (targetPath === undefined) return
    setError(null)
    void openPath(resolveWorkspacePath(targetPath, path)).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }, [openPath, targetPath])
  const addEntryToInput = useCallback((path: string) => {
    if (currentSession === undefined) return
    setError(null)
    try {
      addPathToInput(currentSession, path)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [addPathToInput, currentSession])
  const editorKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') cancelEditor()
  }

  const root = listings.get('')
  const fileCount = root?.fileCount

  const renderRows: (relative: string, depth: number) => ReactNode = useCallback((relative: string, depth: number) => {
    const listing = listings.get(relative)
    if (listing === undefined) {
      return loading.has(relative) ? <div className={css.loading}>{t('panel.loading')}</div> : null
    }
    return listing.entries.map((entry) => {
      const directory = entry.kind === 'directory'
      const isExpanded = directory && expanded.has(entry.path)
      const isRenaming = renaming?.path === entry.path
      const isMenuOpen = menuPath === entry.path
      const menuItems = [
        {
          id: 'open',
          label: directory ? t('action.openFolder') : t('action.openFile'),
          icon: <CodePilotIcon name="external" size={16} />,
        },
        {
          id: 'add-to-input',
          label: t('action.addToInput'),
          icon: <CodePilotIcon name="attachment" size={16} />,
          disabled: currentSession === undefined,
        },
        {
          id: 'rename',
          label: t('action.rename'),
          icon: <CodePilotIcon name="edit" size={16} />,
        },
      ]
      return (
        <div key={entry.path}>
          {isRenaming ? (
            <form className={css.inlineForm} style={{ '--worktree-depth': depth } as CSSProperties} onSubmit={submitRename}>
              <input autoFocus value={draft} aria-label={t('form.renamePlaceholder')} onKeyDown={editorKey} onChange={(event) => { setDraft(event.currentTarget.value) }} />
              <button type="submit">{t('form.save')}</button>
              <button type="button" onClick={cancelEditor}>{t('form.cancel')}</button>
            </form>
          ) : (
            <div className={`${css.row}${isMenuOpen ? ` ${css.menuOpen}` : ''}`} style={{ '--worktree-depth': depth } as CSSProperties}>
              <button
                type="button"
                className={css.entry}
                onClick={() => { if (directory) toggleDirectory(entry.path) }}
                onDoubleClick={() => { beginRename(entry.path, entry.name) }}
              >
                <span className={css.chevron}>
                  {directory ? isExpanded ? <IconChevronDownOutline14 /> : <IconChevronRightOutline14 /> : null}
                </span>
                <CodePilotIcon name={directory ? isExpanded ? 'folder_open' : 'folder' : 'file'} size={15} />
                <span className={css.name}>{entry.name}</span>
              </button>
              <Menu
                open={isMenuOpen}
                onClose={() => { setMenuPath(null) }}
                items={menuItems}
                onSelect={(id) => {
                  setMenuPath(null)
                  if (id === 'open') openEntry(entry.path)
                  if (id === 'add-to-input') addEntryToInput(entry.path)
                  if (id === 'rename') beginRename(entry.path, entry.name)
                }}
                align="end"
                portal
                dense
                closeOnPointerLeave
                anchor={(
                  <button
                    type="button"
                    className={css.rowAction}
                    aria-label={t('action.more', { name: entry.name })}
                    aria-expanded={isMenuOpen}
                    onClick={(event) => {
                      event.stopPropagation()
                      setMenuPath(current => current === entry.path ? null : entry.path)
                    }}
                  >
                    <CodePilotIcon name="more" size={16} />
                  </button>
                )}
              />
            </div>
          )}
          {isExpanded && renderRows(entry.path, depth + 1)}
        </div>
      )
    })
  }, [addEntryToInput, beginRename, currentSession, draft, expanded, listings, loading, menuPath, openEntry, renaming, t, toggleDirectory])

  const subtitle = useMemo(() => fileCount === undefined
    ? targetTitle ?? ''
    : `${targetTitle ?? ''} · ${root?.truncated ? '≥' : ''}${fileCount} ${t('panel.files')}`,
  [fileCount, root?.truncated, t, targetTitle])

  if (!open) return null
  return (
    <aside
      className={css.panel}
      aria-label={t('panel.title')}
      data-beautifului="sidebar-nav"
    >
      <header className={css.header}>
        <div className={css.heading}>
          <div className={css.title}>{t('panel.title')}</div>
          <div className={css.subtitle} title={subtitle}>{subtitle}</div>
        </div>
        <div className={css.toolbar}>
          <Tooltip label={t('action.newFile')} delayMs={450}>
            <button type="button" disabled={targetId === undefined} aria-label={t('action.newFile')} onClick={() => { setCreate({ kind: 'file', parent: '' }); setDraft('') }}><CodePilotIcon name="plus" size={15} /></button>
          </Tooltip>
          <Tooltip label={t('action.newFolder')} delayMs={450}>
            <button type="button" disabled={targetId === undefined} aria-label={t('action.newFolder')} onClick={() => { setCreate({ kind: 'directory', parent: '' }); setDraft('') }}><CodePilotIcon name="folder_add" size={15} /></button>
          </Tooltip>
          <Tooltip label={t('action.refresh')} delayMs={450}>
            <button type="button" disabled={targetId === undefined} aria-label={t('action.refresh')} onClick={refresh}><CodePilotIcon name="refresh" size={15} /></button>
          </Tooltip>
          <Tooltip label={t('action.close')} delayMs={450}>
            <button type="button" aria-label={t('action.close')} onClick={controller.close}><CodePilotIcon name="cancel" size={15} /></button>
          </Tooltip>
        </div>
      </header>
      {targetId === undefined ? (
        <div className={css.empty}>{t('panel.empty')}</div>
      ) : (
        <div className={css.tree}>
          {create !== null && (
            <form className={css.createForm} onSubmit={submitCreate}>
              <CodePilotIcon name={create.kind === 'file' ? 'file' : 'folder'} size={15} />
              <input autoFocus value={draft} aria-label={create.kind === 'file' ? t('form.filePlaceholder') : t('form.folderPlaceholder')} placeholder={create.kind === 'file' ? t('form.filePlaceholder') : t('form.folderPlaceholder')} onKeyDown={editorKey} onChange={(event) => { setDraft(event.currentTarget.value) }} />
              <button type="submit">{t('form.create')}</button>
              <button type="button" onClick={cancelEditor}>{t('form.cancel')}</button>
            </form>
          )}
          {error !== null && <div className={css.error} role="alert"><strong>{t('panel.error')}</strong><span>{error}</span></div>}
          {root === undefined && loading.has('') ? <div className={css.loading}>{t('panel.loading')}</div> : renderRows('', 0)}
        </div>
      )}
    </aside>
  )
}
