// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScheduleSessionDetail, type ScheduleSessionDetailProps } from '../src/client/ScheduleSessionDetail.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

function props(loadSchedule = vi.fn(() => Promise.resolve({ activeCount: 0 }))): ScheduleSessionDetailProps {
  return {
    sessionId: 's1',
    detailStyle: {
      rowClassName: 'row', labelClassName: 'label', valueClassName: 'value',
      iconNames: { branch: 'git', model: 'model', reminder: 'clock' },
    },
    loadSchedule,
    t: (key: keyof typeof en, params?: Record<string, unknown>) => {
      const template = en[key]
      return params === undefined
        ? template
        : template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
    },
  } as unknown as ScheduleSessionDetailProps
}

describe('ScheduleSessionDetail', () => {
  it('renders active count and next time through the owner detail style', async () => {
    const loadSchedule = vi.fn(() => Promise.resolve({
      activeCount: 2, nextScheduledAt: '2030-01-02T03:04:00.000Z',
    }))
    render(<ScheduleSessionDetail {...props(loadSchedule)} />)
    expect(await screen.findByText(/2 · 2030-01-02/)).toBeTruthy()
    expect(screen.getByText('Reminder')).toBeTruthy()
  })

  it('stays absent for an empty or failed summary', async () => {
    const loadSchedule = vi.fn(() => Promise.resolve({ activeCount: 0 }))
    const view = render(<ScheduleSessionDetail {...props(loadSchedule)} />)
    await waitFor(() => { expect(loadSchedule).toHaveBeenCalledOnce() })
    expect(view.container.innerHTML).toBe('')
  })
})
