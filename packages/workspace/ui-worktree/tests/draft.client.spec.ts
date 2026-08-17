import { describe, expect, it } from 'vitest'
import { appendWorktreePath } from '../src/client/draft.ts'

describe('appendWorktreePath', () => {
  it('appends a workspace reference with stable spacing', () => {
    expect(appendWorktreePath('', 'src/main.ts')).toBe('@src/main.ts ')
    expect(appendWorktreePath('Inspect', 'src/main.ts')).toBe('Inspect @src/main.ts ')
    expect(appendWorktreePath('Inspect\n', 'docs')).toBe('Inspect\n@docs ')
  })
})
