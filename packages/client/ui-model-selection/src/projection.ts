/** Pure last-wins fold for the Session model summary. */

import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { SessionModelProjection } from './types.ts'

const sessionModelSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  reasoningEffort: z.string().min(1).optional(),
}).strict().nullable()

function sameSelection(left: SessionModelProjection | null, right: SessionModelProjection): boolean {
  return left?.provider === right.provider
    && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

/** Model summary projection registered by this plugin's Host half. */
export const sessionModelProjectionDefinition: ProjectionDefinition<
  'sessionModel', SessionModelProjection | null
> = {
  key: 'sessionModel',
  schema: sessionModelSchema,
  init: () => null,
  apply: (state, event) => {
    if (event.type !== 'request/header') return state
    const config = event.data.header.config
    const next: SessionModelProjection = {
      provider: config.provider,
      model: config.model,
      ...(config.reasoningEffort === undefined ? {} : { reasoningEffort: config.reasoningEffort }),
    }
    return sameSelection(state, next) ? state : next
  },
  view: state => state,
  stateVersion: 1,
}
