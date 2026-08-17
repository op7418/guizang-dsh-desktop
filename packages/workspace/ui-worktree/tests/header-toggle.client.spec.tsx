// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WorktreeHeaderToggle, type WorktreeHeaderToggleProps } from '../src/client/WorktreeHeaderToggle.tsx'
import { WorktreePanelController } from '../src/client/controller.ts'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

describe('WorktreeHeaderToggle', () => {
  it('places an operable Files control in the session-header utility seat', () => {
    const controller = new WorktreePanelController()
    const props = {
      controller,
      t: (key: keyof typeof en) => en[key],
    } as unknown as WorktreeHeaderToggleProps
    const view = render(<WorktreeHeaderToggle {...props} />)
    const button = view.getByRole('button', { name: 'Files' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(controller.getSnapshot().open).toBe(true)
  })
})
