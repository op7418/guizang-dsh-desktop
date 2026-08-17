/** Provider brand marks shared by provider rows and the add-provider picker. */

import Anthropic from '@lobehub/icons/es/Anthropic/components/Mono'
import Aws from '@lobehub/icons/es/Aws/components/Mono'
import Bailian from '@lobehub/icons/es/Bailian/components/Mono'
import Bedrock from '@lobehub/icons/es/Bedrock/components/Mono'
import Cline from '@lobehub/icons/es/Cline/components/Mono'
import DeepSeek from '@lobehub/icons/es/DeepSeek/components/Mono'
import Google from '@lobehub/icons/es/Google/components/Mono'
import Kimi from '@lobehub/icons/es/Kimi/components/Mono'
import Minimax from '@lobehub/icons/es/Minimax/components/Mono'
import Moonshot from '@lobehub/icons/es/Moonshot/components/Mono'
import Ollama from '@lobehub/icons/es/Ollama/components/Mono'
import OpenAI from '@lobehub/icons/es/OpenAI/components/Mono'
import OpenCode from '@lobehub/icons/es/OpenCode/components/Mono'
import OpenRouter from '@lobehub/icons/es/OpenRouter/components/Mono'
import Volcengine from '@lobehub/icons/es/Volcengine/components/Mono'
import XAI from '@lobehub/icons/es/XAI/components/Mono'
import XiaomiMiMo from '@lobehub/icons/es/XiaomiMiMo/components/Mono'
import Zhipu from '@lobehub/icons/es/Zhipu/components/Mono'
import { CodePilotIcon } from '@deepseek-ai/dsh-client-ui-primitives'

export type ProviderBrand =
  | 'anthropic'
  | 'aws'
  | 'bailian'
  | 'bedrock'
  | 'cline'
  | 'deepseek'
  | 'google'
  | 'kimi'
  | 'minimax'
  | 'moonshot'
  | 'ollama'
  | 'openai'
  | 'opencode'
  | 'openrouter'
  | 'volcengine'
  | 'xai'
  | 'xiaomi'
  | 'zhipu'
  | 'generic'

/**
 * Resolve a provider route and display name to the closest CodePilot brand.
 * @param provider - stable route id.
 * @param displayName - user-facing provider name.
 * @returns the brand key, or the generic service mark.
 */
export function providerBrand(provider: string, displayName: string): ProviderBrand {
  const identity = `${provider} ${displayName}`.toLowerCase()
  if (identity.includes('opencode')) return 'opencode'
  if (identity.includes('openrouter')) return 'openrouter'
  if (identity.includes('cline')) return 'cline'
  if (identity.includes('zhipu') || identity.includes('zai') || identity.includes('glm')) return 'zhipu'
  if (identity.includes('kimi')) return 'kimi'
  if (identity.includes('moonshot')) return 'moonshot'
  if (identity.includes('minimax')) return 'minimax'
  if (identity.includes('volcengine') || identity.includes('doubao')) return 'volcengine'
  if (identity.includes('bailian') || identity.includes('aliyun') || identity.includes('qwen')) return 'bailian'
  if (identity.includes('xiaomi') || identity.includes('mimo')) return 'xiaomi'
  if (identity.includes('xai') || identity.includes('grok')) return 'xai'
  if (identity.includes('openai') || identity.includes('codex')) return 'openai'
  if (identity.includes('deepseek')) return 'deepseek'
  if (identity.includes('anthropic') || identity.includes('claude')) return 'anthropic'
  if (identity.includes('bedrock')) return 'bedrock'
  if (identity.includes('amazon') || identity.includes('aws')) return 'aws'
  if (identity.includes('google') || identity.includes('gemini') || identity.includes('vertex')) return 'google'
  if (identity.includes('ollama')) return 'ollama'
  return 'generic'
}

export interface ProviderBrandIconProps {
  provider: string
  displayName: string
  size?: number | undefined
  className?: string | undefined
}

/** Render the provider mark from CodePilot's LobeHub icon source. */
export function ProviderBrandIcon({
  provider,
  displayName,
  size = 20,
  className,
}: ProviderBrandIconProps) {
  const props = { size, ...(className === undefined ? {} : { className }), 'aria-hidden': true as const }
  switch (providerBrand(provider, displayName)) {
    case 'anthropic': return <Anthropic {...props} />
    case 'aws': return <Aws {...props} />
    case 'bailian': return <Bailian {...props} />
    case 'bedrock': return <Bedrock {...props} />
    case 'cline': return <Cline {...props} />
    case 'deepseek': return <DeepSeek {...props} />
    case 'google': return <Google {...props} />
    case 'kimi': return <Kimi {...props} />
    case 'minimax': return <Minimax {...props} />
    case 'moonshot': return <Moonshot {...props} />
    case 'ollama': return <Ollama {...props} />
    case 'openai': return <OpenAI {...props} />
    case 'opencode': return <OpenCode {...props} />
    case 'openrouter': return <OpenRouter {...props} />
    case 'volcengine': return <Volcengine {...props} />
    case 'xai': return <XAI {...props} />
    case 'xiaomi': return <XiaomiMiMo {...props} />
    case 'zhipu': return <Zhipu {...props} />
    case 'generic': return <CodePilotIcon name="server" size={size} className={className} />
  }
}
