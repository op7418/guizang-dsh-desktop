/** Generic first-run provider guidance over the shared Models snapshot. */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelsSettingsState, ModelsSettingsStore } from './store.ts'
import { onboardingReadiness } from './store.ts'
import type { en } from './locales.ts'
import { OnboardingModal } from './OnboardingModal.tsx'
import styles from './ProviderOnboardingDialog.module.css'

/** Registration-side dependencies of {@link ProviderOnboardingDialog}. */
export interface ProviderOnboardingInjected {
  hooks: {
    /** Shared Models-page join state, bound by the slot renderer. */
    models: SnapshotStore<ModelsSettingsState>
  }
  /** Shared Models-page join controller. */
  controller: ModelsSettingsStore
  /** Existing wire face shared with the provider settings page. */
  api: Pick<IApiClient, 'settings' | 'credentials' | 'llm'>
  /** Feature copy. */
  t: (key: keyof typeof en) => string
}

/** Slot owner props plus the feature's injected dependencies. */
export type ProviderOnboardingDialogProps =
  PropsRuntime<'settings.onboarding'> & InjectFace<ProviderOnboardingInjected>

/**
 * Offer a vendor-neutral path into provider setup without blocking exploration.
 * @param props - settings-shell owner state and Models feature dependencies.
 * @returns the onboarding modal only while no usable provider exists.
 */
export function ProviderOnboardingDialog(props: ProviderOnboardingDialogProps): ReactNode {
  const { complete, openSection, controller, useModels, t } = props
  const state = useModels(snapshot => snapshot)
  const readiness = onboardingReadiness(state)

  useEffect(() => {
    if (state.status === 'idle') void controller.load()
  }, [controller, state.status])

  useEffect(() => {
    if (readiness.kind === 'provider-ready' || readiness.kind === 'unavailable') complete()
  }, [complete, readiness.kind])

  if (readiness.kind !== 'setup-required') return null

  const addProvider = (): void => {
    openSection('providers')
    complete()
  }

  return (
    <OnboardingModal title={t('onboardingTitle')} focusTitle>
      <p className={styles.description}>{t('onboardingDescription')}</p>
      <div className={styles.actions}>
        <Button variant="outline" onClick={complete}>{t('onboardingLater')}</Button>
        <Button variant="primary" onClick={addProvider}>{t('onboardingOpenProviders')}</Button>
      </div>
    </OnboardingModal>
  )
}
