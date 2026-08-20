/** Generic first-run provider guidance over the shared Models snapshot. */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelsSettingsState, ModelsSettingsStore } from './store.ts'
import { onboardingReadiness } from './store.ts'
import type { ProviderOnboardingSettings } from '../onboarding-settings.ts'
import type { en } from './locales.ts'
import { OnboardingModal } from './OnboardingModal.tsx'
import styles from './ProviderOnboardingDialog.module.css'

/** Registration-side dependencies of {@link ProviderOnboardingDialog}. */
export interface ProviderOnboardingInjected {
  hooks: {
    /** Shared Models-page join state, bound by the slot renderer. */
    models: SnapshotStore<ModelsSettingsState>
    /** Profile-scoped persistent onboarding choice. */
    onboarding: SettingsScope<ProviderOnboardingSettings>
  }
  /** Shared Models-page join controller. */
  controller: ModelsSettingsStore
  /** Existing wire face shared with the provider settings page. */
  api: Pick<IApiClient, 'settings' | 'credentials' | 'llm'>
  /** Feature copy. */
  t: (key: keyof typeof en) => string
  /** Persist one explicit skip/open choice in this Harness profile. */
  dismissOnboarding: () => void
}

/** Slot owner props plus the feature's injected dependencies. */
export type ProviderOnboardingDialogProps =
  PropsRuntime<'settings.onboarding'> & InjectFace<ProviderOnboardingInjected>

/** Whether a dialog outside this onboarding step currently owns the screen. */
function hasExternalDialog(): boolean {
  return [...document.querySelectorAll('[role="dialog"]')]
    .some(dialog => dialog.querySelector('[data-pilot-provider-onboarding]') === null)
}

/**
 * Defer first-run guidance until an already-started user flow releases its
 * dialog. Provider discovery is asynchronous and must never replace a folder
 * picker (or another modal) merely because its response settled later.
 */
function useDialogAvailable(enabled: boolean): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const update = (): void => { setAvailable(!hasExternalDialog()) }
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true })
    // Wait one task before the first presentation so sibling dialogs created
    // by the same interaction have committed to the document.
    const timer = window.setTimeout(update, 0)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [enabled])

  return enabled && available
}

/**
 * Offer a vendor-neutral path into provider setup without blocking exploration.
 * @param props - settings-shell owner state and Models feature dependencies.
 * @returns the onboarding modal only while no usable provider exists.
 */
export function ProviderOnboardingDialog(props: ProviderOnboardingDialogProps): ReactNode {
  const { complete, openSection, controller, useModels, useOnboarding, t } = props
  const state = useModels(snapshot => snapshot)
  const onboarding = useOnboarding(snapshot => snapshot)
  const readiness = onboardingReadiness(state)
  const [locallyDismissed, setLocallyDismissed] = useState(false)
  const dismissed = locallyDismissed || onboarding.value?.dismissed === true
  const ownerCompletionSent = useRef(false)
  const dialogAvailable = useDialogAvailable(
    onboarding.status !== 'loading' && readiness.kind === 'setup-required' && !dismissed,
  )

  useEffect(() => {
    if (state.status === 'idle') void controller.load()
  }, [controller, state.status])

  useEffect(() => {
    if (
      dismissed
      || readiness.kind === 'provider-ready'
      || readiness.kind === 'unavailable'
    ) {
      if (ownerCompletionSent.current) return
      ownerCompletionSent.current = true
      complete()
    }
  }, [complete, dismissed, readiness.kind])

  if (dismissed || readiness.kind !== 'setup-required' || !dialogAvailable) return null

  const addProvider = (): void => {
    setLocallyDismissed(true)
    props.dismissOnboarding()
    openSection('providers')
  }

  const skip = (): void => {
    setLocallyDismissed(true)
    props.dismissOnboarding()
  }

  return (
    <OnboardingModal title={t('onboardingTitle')} focusTitle>
      <div data-pilot-provider-onboarding>
        <p className={styles.description}>{t('onboardingDescription')}</p>
        <div className={styles.actions}>
          <Button variant="outline" onClick={skip}>{t('onboardingLater')}</Button>
          <Button variant="primary" onClick={addProvider}>{t('onboardingOpenProviders')}</Button>
        </div>
      </div>
    </OnboardingModal>
  )
}
