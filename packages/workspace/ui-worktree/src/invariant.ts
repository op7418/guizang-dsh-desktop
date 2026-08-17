/** Package-owned invariant companion for `@deepseek-ai/dsh-ui-worktree`. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-ui-worktree'

export const name = 'ui-worktree-invariant'
export const inject = ['invariants']
/** No runtime invariant: file listings and Git summaries are immutable per-request Host responses. */
const install: InvariantInstaller = () => {}
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
