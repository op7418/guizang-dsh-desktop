import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-ui-schedule-summary',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  { hostPhase: true },
)
