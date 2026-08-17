/** Host half: publish the last durable provider/model route as a Session projection. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session-projection'
import { sessionModelProjectionDefinition } from './projection.ts'

export type * from './types.ts'

export const inject = ['sessionProjections']

/** Register the model summary projection while this plugin is loaded. */
export function apply(ctx: Context): void {
  ctx.sessionProjections.register(sessionModelProjectionDefinition)
}
