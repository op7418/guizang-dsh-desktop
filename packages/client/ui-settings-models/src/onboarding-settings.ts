/** Provider-onboarding preference stored in the current Harness profile. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by provider onboarding. */
export const PROVIDER_ONBOARDING_SETTINGS_NAMESPACE = 'pilot-provider-onboarding'

/** Field recording the user's explicit choice to leave first-run setup. */
export const PROVIDER_ONBOARDING_DISMISSED_FIELD = 'dismissed'

/** Durable provider-onboarding state for one Harness settings profile. */
export interface ProviderOnboardingSettings {
  /** Whether setup was explicitly skipped or opened once. */
  dismissed: boolean
}

/** Profile-scoped provider-onboarding settings schema. */
export const ProviderOnboardingSettingsSchema: z<ProviderOnboardingSettings> = z.object({
  [PROVIDER_ONBOARDING_DISMISSED_FIELD]: z.boolean().default(false),
})
