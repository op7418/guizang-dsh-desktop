import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as ModelsInvariant from '@deepseek-ai/dsh-client-ui-settings-models/invariant'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { ModelsSection } from '../src/client/ModelsSection.tsx'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(ModelsInvariant).await()).resolves.toBeDefined()
  })

  it('node-half apply tolerates an absent optional settings provider', async () => {
    const { apply } = await import('@deepseek-ai/dsh-client-ui-settings-models')
    expect(() => { apply(new Context()) }).not.toThrow()
  })

  it('renders null until the shell injects the section dependencies', () => {
    expect(ModelsSection({})).toBeNull()
  })
})
