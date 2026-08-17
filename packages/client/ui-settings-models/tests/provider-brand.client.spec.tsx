// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProviderBrandIcon, providerBrand } from '../src/client/ProviderBrandIcon.tsx'

afterEach(cleanup)

describe('ProviderBrandIcon', () => {
  it('resolves the CodePilot provider brands from route or display identity', () => {
    expect(providerBrand('deepseek-official', 'DeepSeek')).toBe('deepseek')
    expect(providerBrand('openrouter', 'OpenRouter')).toBe('openrouter')
    expect(providerBrand('vertex-ai', 'Google Vertex')).toBe('google')
    expect(providerBrand('bedrock', 'Amazon Bedrock')).toBe('bedrock')
    expect(providerBrand('zai', 'GLM Coding Plan')).toBe('zhipu')
    expect(providerBrand('moonshotai', 'Moonshot AI')).toBe('moonshot')
    expect(providerBrand('minimax-cn', 'MiniMax')).toBe('minimax')
    expect(providerBrand('qwen-token-plan', 'Aliyun Bailian')).toBe('bailian')
    expect(providerBrand('xiaomi', 'MiMo')).toBe('xiaomi')
    expect(providerBrand('xai', 'Grok')).toBe('xai')
    expect(providerBrand('acme', 'Acme Gateway')).toBe('generic')
  })

  it('renders a brand mark and keeps a generic service fallback', () => {
    const branded = render(<ProviderBrandIcon provider="anthropic" displayName="Claude" />)
    expect(branded.container.querySelector('svg')).toBeTruthy()
    branded.unmount()
    const generic = render(<ProviderBrandIcon provider="acme" displayName="Acme Gateway" />)
    expect(generic.container.querySelector('svg')).toBeTruthy()
  })
})
