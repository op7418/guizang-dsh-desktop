// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorktreeSessionDetail, type WorktreeSessionDetailProps } from '../src/client/WorktreeSessionDetail.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

function props(workspaceId?: string, loadBranch = vi.fn(() => Promise.resolve<string | undefined>(undefined))): WorktreeSessionDetailProps {
  return {
    ...(workspaceId === undefined ? {} : { workspaceId }),
    detailStyle: {
      rowClassName: 'row', labelClassName: 'label', valueClassName: 'value',
      iconNames: { branch: 'git', model: 'model', reminder: 'clock' },
    },
    loadBranch,
    t: (key: keyof typeof en) => en[key],
  } as unknown as WorktreeSessionDetailProps
}

describe('WorktreeSessionDetail', () => {
  it('requests the branch-only summary and renders it through the owner', async () => {
    const loadBranch = vi.fn(() => Promise.resolve<string | undefined>('feature/sidebar'))
    render(<WorktreeSessionDetail {...props('w1', loadBranch)} />)

    expect(await screen.findByText('feature/sidebar')).toBeTruthy()
    expect(screen.getByText('Branch')).toBeTruthy()
    expect(loadBranch).toHaveBeenCalledWith('w1', expect.any(AbortSignal))
  })

  it('stays absent without a Workspace or when the optional summary fails', async () => {
    const loadBranch = vi.fn(() => Promise.reject(new Error('not a repository')))
    const view = render(<WorktreeSessionDetail {...props(undefined, loadBranch)} />)
    expect(view.container.innerHTML).toBe('')
    expect(loadBranch).not.toHaveBeenCalled()

    view.rerender(<WorktreeSessionDetail {...props('w2', loadBranch)} />)
    await waitFor(() => { expect(loadBranch).toHaveBeenCalledOnce() })
    expect(view.container.innerHTML).toBe('')
  })
})
