/** Generic first-run provider guidance over the shared Models snapshot. */

import { useEffect, useRef, useState } from 'react'
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

const ONBOARDING_DISMISSED_KEY = 'pilot-harness.provider-onboarding.dismissed'
const ONBOARDING_DISMISSED_EVENT = 'pilot-harness:provider-onboarding-dismissed'

/** Keep an explicit choice across plugin remounts, reloads, and app restarts. */
function onboardingWasDismissed(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true'
  } catch {
    // A locked-down Web Harness may disable storage. The prompt still remains
    // skippable for the lifetime of its current settings-shell mount.
    return false
  }
}

/** Record either explicit path (skip or open settings) before the shell closes. */
function dismissOnboarding(): void {
  try {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
  } catch {
    // Storage is an enhancement for remounts, never a prerequisite for using
    // or dismissing the provider guidance.
  }
  // The browser `storage` event only reaches other documents. Notify sibling
  // plugin surfaces in this document as well so none can retain a stale
  // pre-dismissal render and reopen after another dialog closes.
  window.dispatchEvent(new Event(ONBOARDING_DISMISSED_EVENT))
}

/** Reactive view of the persistent choice shared by every mounted surface. */
function useOnboardingDismissed(): boolean {
  const [dismissed, setDismissed] = useState(onboardingWasDismissed)

  useEffect(() => {
    const dismiss = (): void => { setDismissed(true) }
    const syncStorage = (event: StorageEvent): void => {
      if (event.key === ONBOARDING_DISMISSED_KEY && event.newValue === 'true') dismiss()
    }
    window.addEventListener(ONBOARDING_DISMISSED_EVENT, dismiss)
    window.addEventListener('storage', syncStorage)
    // Close the subscribe/read gap if another surface dismissed while this
    // component was committing.
    if (onboardingWasDismissed()) dismiss()
    return () => {
      window.removeEventListener(ONBOARDING_DISMISSED_EVENT, dismiss)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  return dismissed
}

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
  const { complete, openSection, controller, useModels, t } = props
  const state = useModels(snapshot => snapshot)
  const readiness = onboardingReadiness(state)
  const dismissed = useOnboardingDismissed()
  const ownerCompletionSent = useRef(false)
  const dialogAvailable = useDialogAvailable(
    readiness.kind === 'setup-required' && !dismissed,
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
    dismissOnboarding()
    openSection('providers')
  }

  const skip = (): void => {
    dismissOnboarding()
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
