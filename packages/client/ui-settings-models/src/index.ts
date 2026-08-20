/** Host registration for profile-scoped provider-onboarding state. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  PROVIDER_ONBOARDING_SETTINGS_NAMESPACE,
  ProviderOnboardingSettingsSchema,
} from './onboarding-settings.ts'

/** Register provider-onboarding state in the current Harness settings profile. */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(PROVIDER_ONBOARDING_SETTINGS_NAMESPACE),
      ProviderOnboardingSettingsSchema,
    )
  })
}
