import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { apply } from '@deepseek-ai/dsh-client-ui-settings-models'
import {
  PROVIDER_ONBOARDING_SETTINGS_NAMESPACE,
} from '../src/onboarding-settings.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

describe('ui-settings-models host', () => {
  it('keeps provider-onboarding dismissal in the active settings profile', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    const ns = settingsNamespace(PROVIDER_ONBOARDING_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual({ dismissed: false })
    await ctx.settings.update(ns, { dismissed: true })
    expect(ctx.settings.get(ns)).toEqual({ dismissed: true })
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })
})
