/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-settings-models`.
 * @module @deepseek-ai/dsh-client-ui-settings-models/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-settings-models'

/** Cordis companion plugin name. */
export const name = 'client-ui-settings-models-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the settings provider validates and publishes the
 * profile-scoped onboarding section, while the browser store joins provider,
 * credential, and catalog snapshots without emitting a package-owned event.
 * Host registration and browser behavior are covered by this package's specs.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
