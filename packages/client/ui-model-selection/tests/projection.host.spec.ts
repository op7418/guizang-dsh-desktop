import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { sessionModelProjectionDefinition } from '../src/projection.ts'

function header(seq: number, provider: string, model: string, reasoningEffort?: string): SessionEvent {
  return {
    type: 'request/header', seq, time: seq,
    data: {
      reason: seq === 0 ? 'initial' : 'changed',
      header: {
        config: { provider, model, ...(reasoningEffort === undefined ? {} : { reasoningEffort }) },
        system: '',
        tools: [],
      },
    },
  } as SessionEvent
}

describe('session model projection', () => {
  it('starts absent, follows durable request headers, and preserves unchanged references', () => {
    const initial = sessionModelProjectionDefinition.init()
    expect(initial).toBeNull()

    const selected = sessionModelProjectionDefinition.apply(initial, header(0, 'codepilot', 'deepseek-v4'))
    expect(sessionModelProjectionDefinition.view(selected)).toEqual({
      provider: 'codepilot', model: 'deepseek-v4',
    })

    const unrelated = { type: 'turn/end', seq: 1, time: 1, data: { turn: 1, reason: 'completed' } } as SessionEvent
    expect(sessionModelProjectionDefinition.apply(selected, unrelated)).toBe(selected)
    expect(sessionModelProjectionDefinition.apply(selected, header(2, 'codepilot', 'deepseek-v4'))).toBe(selected)

    expect(sessionModelProjectionDefinition.apply(selected, header(3, 'codepilot', 'deepseek-v4', 'high')))
      .toEqual({ provider: 'codepilot', model: 'deepseek-v4', reasoningEffort: 'high' })
  })
})
