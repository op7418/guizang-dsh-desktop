import { describe, expect, it } from 'vitest'
import { isCodePilotProvider } from '../src/client/CodePilotProviderCatalog.ts'

describe('CodePilot provider catalog', () => {
  it('removes unsupported pi-ai built-ins without blocking extension providers', () => {
    expect(isCodePilotProvider('azure-openai-responses')).toBe(false)
    expect(isCodePilotProvider('anthropic')).toBe(false)
    expect(isCodePilotProvider('github-copilot')).toBe(false)
    expect(isCodePilotProvider('deepseek')).toBe(true)
    expect(isCodePilotProvider('openrouter')).toBe(true)
    expect(isCodePilotProvider('acme-external-plugin')).toBe(true)
    expect(isCodePilotProvider('azure-openai-responses', true)).toBe(true)
  })
})
