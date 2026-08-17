// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorktreePanel, type WorktreePanelProps } from '../src/client/WorktreePanel.tsx'
import { WorktreePanelController } from '../src/client/controller.ts'
import { en } from '../src/client/locales.ts'
import type { WorktreeEntry, WorktreeListing, WorktreeMutation } from '../src/types.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function translator(key: keyof typeof en, params?: Readonly<Record<string, unknown>>): string {
  const name = params?.name
  return en[key].replace('{name}', typeof name === 'string' ? name : '')
}

function renderPanel(options: { current?: string } = {}) {
  const controller = new WorktreePanelController()
  controller.toggle()
  let entries: WorktreeEntry[] = [
    { name: 'src', path: 'src', kind: 'directory' },
    { name: 'readme.md', path: 'readme.md', kind: 'file' },
  ]
  const mutateWorktree = vi.fn(async (action: WorktreeMutation) => {
    if (action.operation === 'rename') {
      entries = entries.map(entry => entry.path === action.path
        ? { ...entry, name: action.name, path: action.name }
        : entry)
    }
    return { ok: true as const, path: action.name }
  })
  const loadWorktree = vi.fn(async ({ relative = '' }: { relative?: string }) => {
    const listing: WorktreeListing = {
      workspaceId: 'w1',
      workspaceTitle: 'Fixture',
      relative,
      entries: relative === '' ? entries : [],
      ...(relative === '' ? { fileCount: entries.length } : {}),
    }
    return listing
  })

  const sessionState = { current: options.current }
  const workspaceState = {
    items: [{
      workspaceId: 'w1',
      title: 'Fixture',
      path: '/workspace',
      sessionIds: options.current === undefined ? [] : [options.current],
    }],
    recentWorkspaceId: 'w1',
  }
  const openPath = vi.fn(() => Promise.resolve())
  const addPathToInput = vi.fn()
  const props = {
    controller,
    loadWorktree,
    mutateWorktree,
    openPath,
    addPathToInput,
    useSessions: ((selector: (state: typeof sessionState) => unknown) => selector(sessionState)),
    useWorkspaces: ((selector: (state: typeof workspaceState) => unknown) => selector(workspaceState)),
    t: translator,
  } as unknown as WorktreePanelProps
  const view = render(<WorktreePanel {...props} />)
  return { ...view, loadWorktree, mutateWorktree, openPath, addPathToInput }
}

describe('WorktreePanel row actions', () => {
  it('opens files and folders, adds a path to the draft, and keeps rename in the shared menu', async () => {
    const view = renderPanel({ current: 's1' })
    await screen.findByText('readme.md')

    fireEvent.click(screen.getByRole('button', { name: 'More actions for readme.md' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open file' }))
    await waitFor(() => { expect(view.openPath).toHaveBeenCalledWith('/workspace/readme.md') })

    fireEvent.click(screen.getByRole('button', { name: 'More actions for src' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open folder' }))
    await waitFor(() => { expect(view.openPath).toHaveBeenCalledWith('/workspace/src') })

    fireEvent.click(screen.getByRole('button', { name: 'More actions for readme.md' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add path to input' }))
    expect(view.addPathToInput).toHaveBeenCalledWith('s1', 'readme.md')

    fireEvent.click(screen.getByRole('button', { name: 'More actions for readme.md' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New name' }), { target: { value: 'guide.md' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('guide.md')
    expect(view.mutateWorktree).toHaveBeenCalledWith({
      operation: 'rename', workspaceId: 'w1', path: 'readme.md', name: 'guide.md',
    })
  })

  it('disables draft insertion until a session exists', async () => {
    renderPanel()
    await screen.findByText('readme.md')
    fireEvent.click(screen.getByRole('button', { name: 'More actions for readme.md' }))
    expect(screen.getByRole('menuitem', { name: 'Add path to input' }).hasAttribute('disabled')).toBe(true)
  })

  it('surfaces native open failures without closing the file tree', async () => {
    const view = renderPanel({ current: 's1' })
    view.openPath.mockRejectedValueOnce(new Error('No associated application'))
    await screen.findByText('readme.md')
    fireEvent.click(screen.getByRole('button', { name: 'More actions for readme.md' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open file' }))
    expect(await screen.findByText('No associated application')).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Files' })).toBeTruthy()
  })
})
