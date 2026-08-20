/**
 * CodePilot-style provider/model settings plugin, browser half. It registers
 * separate Providers and Models pages plus first-run provider guidance. Provider
 * configuration, the live model catalog, and credentials stay behind their
 * existing plugin and wire contracts.
 * Export discipline:
 * packages/client/AGENTS.md.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
// Type-only: pulls the shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge and the forwarded-event key face
// (settings/credentials invalidations ride the allowlist) into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { ModelsSection } from './ModelsSection.tsx'
import type { ModelsSectionInjected } from './ModelsSection.tsx'
import { ModelCatalogSection } from './ModelCatalogSection.tsx'
import { ProviderOnboardingDialog } from './ProviderOnboardingDialog.tsx'
import type { ProviderOnboardingInjected } from './ProviderOnboardingDialog.tsx'
import { ModelsSettingsStore } from './store.ts'
import { en, zh, type ModelsKey } from './locales.ts'
import {
  PROVIDER_ONBOARDING_DISMISSED_FIELD,
  PROVIDER_ONBOARDING_SETTINGS_NAMESPACE,
  type ProviderOnboardingSettings,
} from '../onboarding-settings.ts'

export type { ModelsSectionInjected, ModelsSectionProps } from './ModelsSection.tsx'
export { ModelCatalogSection, saveDefaultModel } from './ModelCatalogSection.tsx'
export type { ModelsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Models page + product-onboarding copy. */
    'settings.models': ModelsKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.models'
export type { ModelsSettingsState, ProviderRow } from './store.ts'

/**
 * Refetch the page snapshot only after its first load: an unopened Models
 * page must not fetch on background invalidations.
 * @param controller - the page store.
 */
export function refreshIfLoaded(controller: ModelsSettingsStore): void {
  if (controller.store.getSnapshot().status === 'idle') return
  void controller.load()
}

/**
 * Required services (cordis fiber inject). The target slot is declared by
 * ui-settings' apply, whose activation order relative to this one is NOT
 * constrained; registration depends on each slot through `slots.inject()`.
 */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/**
 * Register the Providers and Models sections once `settings.section` is on
 * the ledger, wire their shared store to the connection, and keep both fresh
 * on every pushed invalidation (settings, credentials, or provider topology).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-models: copy dictionaries')

  const connection = ctx.get('connection') as ConnectionHandle
  const controller = new ModelsSettingsStore(connection.api)
  const onboarding = ctx.settingsScope.bind<ProviderOnboardingSettings>({
    namespace: PROVIDER_ONBOARDING_SETTINGS_NAMESPACE,
  })
  const useSnapshot = bindSnapshotSelector(controller.store)
  // Registration-time text (the nav label thunk) and the inject faces share
  // one bound translate; copy freshness rides the locale revision.
  const t = ctx.locale.bind(NS) as ModelsSectionInjected['t']
  const injected = (): ModelsSectionInjected => ({
    controller,
    useSnapshot,
    api: connection.api,
    t,
  })
  const onboardingInjected = (): ProviderOnboardingInjected => ({
    controller,
    hooks: { models: controller.store, onboarding },
    api: connection.api,
    t,
    dismissOnboarding: () => {
      void onboarding.set(PROVIDER_ONBOARDING_DISMISSED_FIELD, true)
    },
  })

  // Pushed invalidations converge every open surface without polling: any
  // settings/credentials/topology change refetches once the page loaded.
  ctx.effect(() => {
    const refreshModels = (): void => { refreshIfLoaded(controller) }
    const disposers = [
      ctx.remote.$on('settings/document-updated', refreshModels),
      ctx.remote.$on('credentials/updated', refreshModels),
      ctx.remote.$on('llm/adapters-updated', refreshModels),
      ctx.on('connection/reset', refreshModels),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'ui-settings-models: pushed invalidations')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'providers',
    order: 10,
    label: () => t('providerNav'),
    inject: injected,
  }, ModelsSection))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'models',
    order: 20,
    label: () => t('nav'),
    inject: injected,
  }, ModelCatalogSection))
  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding',
    id: 'provider-setup',
    order: 0,
    inject: onboardingInjected,
  }, ProviderOnboardingDialog))
}
