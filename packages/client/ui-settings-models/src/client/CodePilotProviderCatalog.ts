/**
 * Installed pi-ai providers that CodePilot deliberately does not expose in
 * its curated provider picker. Unknown providers remain visible so external
 * Harness provider plugins keep composing with this UI.
 */
const EXCLUDED_PI_AI_PROVIDERS = new Set([
  'ant-ling',
  'anthropic',
  'azure-openai-responses',
  'cerebras',
  'cloudflare-ai-gateway',
  'cloudflare-workers-ai',
  'fireworks',
  'github-copilot',
  'groq',
  'huggingface',
  'mistral',
  'nvidia',
  'together',
  'vercel-ai-gateway',
])

/**
 * Apply CodePilot's curated provider visibility while preserving explicit and third-party routes.
 * @param provider - provider identifier to classify.
 * @param declared - whether the user explicitly declared this provider.
 * @returns whether the provider belongs in CodePilot's management UI.
 */
export function isCodePilotProvider(provider: string, declared = false): boolean {
  return declared || !EXCLUDED_PI_AI_PROVIDERS.has(provider)
}
