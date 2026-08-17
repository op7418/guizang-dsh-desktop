// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ModelSessionDetail, type ModelSessionDetailProps } from '../src/client/ModelSessionDetail.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

function props(projections: Readonly<Record<string, unknown>>): ModelSessionDetailProps {
  return {
    projections,
    detailStyle: {
      rowClassName: 'row', labelClassName: 'label', valueClassName: 'value',
      iconNames: { branch: 'git', model: 'model', reminder: 'clock' },
    },
    t: (key: keyof typeof en) => en[key],
  } as unknown as ModelSessionDetailProps
}

describe('ModelSessionDetail', () => {
  it('renders the durable model projection without loading a Session', () => {
    render(<ModelSessionDetail {...props({
      sessionModel: { provider: 'codepilot', model: 'DeepSeek V4' },
    })} />)
    expect(screen.getByText('Model')).toBeTruthy()
    expect(screen.getByText('DeepSeek V4 · codepilot')).toBeTruthy()
  })

  it('renders nothing when the Session has no durable model projection', () => {
    const view = render(<ModelSessionDetail {...props({})} />)
    expect(view.container.innerHTML).toBe('')
  })
})
