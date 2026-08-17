/** Package-owned invariant companion for the stateless CodePilot theme plugin. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-codepilot-theme'
export const name = 'client-ui-codepilot-theme-invariant'
export const inject = ['invariants']
const install: InvariantInstaller = () => {
  // No runtime invariant: this package owns reversible browser presentation only.
}
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
