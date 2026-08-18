/** Pure first-run readiness projection over the shared Models join. */
import { describe, expect, it } from 'vitest'
import type { CredentialView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ModelsSettingsState, ProviderRow } from '../src/client/store.ts'
import { onboardingReadiness, providerUsable } from '../src/client/store.ts'

const missingCredential: CredentialView = { configured: false, writable: true }

function row(overrides: Partial<ProviderRow> = {}): ProviderRow {
  return {
    entry: {
      provider: 'custom', displayName: 'Custom', settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'custom'], active: true,
    },
    configured: true,
    removable: true,
    apiKeyEnv: 'CUSTOM_API_KEY',
    credential: missingCredential,
    ...overrides,
  }
}

function state(overrides: Partial<ModelsSettingsState> = {}): ModelsSettingsState {
  return {
    status: 'ready', error: null, credentialError: null, catalogError: null,
    writable: true, rows: [], namespaces: new Map(), groups: [],
    catalogFailures: [], defaultModel: undefined, ...overrides,
  }
}

describe('providerUsable', () => {
  it('requires an active route and its named credential', () => {
    expect(providerUsable(row({ credential: { configured: true, source: 'file', writable: true } }))).toBe(true)
    expect(providerUsable(row())).toBe(false)
    expect(providerUsable(row({ entry: { ...row().entry, active: false } }))).toBe(false)
  })

  it('accepts active provider-native authentication', () => {
    expect(providerUsable(row({ apiKeyEnv: undefined, credential: undefined }))).toBe(true)
  })
})

describe('onboardingReadiness', () => {
  it('waits for the initial join', () => {
    expect(onboardingReadiness(state({ status: 'idle' }))).toEqual({ kind: 'loading' })
    expect(onboardingReadiness(state({ status: 'loading' }))).toEqual({ kind: 'loading' })
  })

  it('offers generic setup when no provider is usable', () => {
    expect(onboardingReadiness(state())).toEqual({ kind: 'setup-required' })
    expect(onboardingReadiness(state({ rows: [row()] }))).toEqual({ kind: 'setup-required' })
  })

  it('ends onboarding for any usable provider', () => {
    expect(onboardingReadiness(state({
      rows: [row({ credential: { configured: true, source: 'env', writable: false } })],
    }))).toEqual({ kind: 'provider-ready' })
  })

  it('never blocks a failed or read-only installation', () => {
    expect(onboardingReadiness(state({ status: 'error', error: 'offline' }))).toEqual({ kind: 'unavailable' })
    expect(onboardingReadiness(state({ writable: false }))).toEqual({ kind: 'unavailable' })
  })
})
