/** Package-owned invariant companion for `@deepseek-ai/dsh-ui-schedule-summary`. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-ui-schedule-summary'
/** Cordis companion plugin name. */
export const name = 'ui-schedule-summary-invariant'
/** Service required before reserving this package's invariant ownership. */
export const inject = ['invariants']
/** No runtime invariant: the endpoint returns one immutable projection of an inspected durable log. */
const install: InvariantInstaller = () => {}
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns The installed registration's disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
