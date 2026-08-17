// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { ModelCatalogSection } from '../src/client/ModelCatalogSection.tsx'
import { ModelsSettingsStore } from '../src/client/store.ts'
import type { ModelsSectionInjected } from '../src/client/ModelsSection.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

describe('ModelCatalogSection', () => {
  it('filters multimodal routes and writes the default-model namespace', async () => {
    const mutate = vi.fn(() => Promise.resolve({
      rpcId: 'r' as never,
      result: { ok: true as const, value: {} as never },
    }))
    const api = { settings: { mutate } } as never
    const controller = new ModelsSettingsStore({} as never)
    controller.store.update((state) => {
      state.status = 'ready'
      state.writable = true
      state.groups = [{
        id: 'openai',
        name: 'OpenAI',
        models: [
          { id: 'gpt-vision', name: 'GPT Vision', inputModalities: ['text', 'image'] },
          { id: 'gpt-text', name: 'GPT Text', inputModalities: ['text'] },
        ],
      }, {
        id: 'azure-openai-responses',
        name: 'Azure OpenAI',
        models: [{ id: 'gpt-azure', name: 'Azure GPT', inputModalities: ['text'] }],
      }]
      state.namespaces = new Map([['agent-default-model', {
        ns: 'agent-default-model',
        schema: {},
        value: { provider: 'old', model: 'old-model' },
        applies: 'live',
        secrets: [],
        revision: 4,
      }]])
    })
    vi.spyOn(controller, 'load').mockResolvedValue()
    const injected: ModelsSectionInjected = {
      controller,
      useSnapshot: bindSnapshotSelector(controller.store),
      api,
      t: key => en[key],
    }
    render(<ModelCatalogSection {...injected} />)

    expect(screen.getByText('GPT Vision')).toBeTruthy()
    expect(screen.getByText('GPT Text')).toBeTruthy()
    expect(screen.queryByText('Azure GPT')).toBeNull()
    expect(screen.getByText('1 providers · 2 models')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.filterMultimodal }))
    expect(screen.getByText('GPT Vision')).toBeTruthy()
    expect(screen.queryByText('GPT Text')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: `${en.setDefault} GPT Vision` }))
    await vi.waitFor(() => { expect(mutate).toHaveBeenCalledOnce() })
    expect(mutate).toHaveBeenCalledWith({
      ns: 'agent-default-model',
      expectedRevision: 4,
      ops: [
        { op: 'set', path: ['provider'], value: 'openai' },
        { op: 'set', path: ['model'], value: 'gpt-vision' },
        { op: 'unset', path: ['reasoningEffort'] },
      ],
    })
  })

  it('keeps an already configured provider visible outside the curated add catalog', () => {
    const controller = new ModelsSettingsStore({} as never)
    controller.store.update((state) => {
      state.status = 'ready'
      state.rows = [{
        entry: {
          provider: 'azure-openai-responses', displayName: 'Azure OpenAI',
          settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'azure-openai-responses'], active: true,
        },
        configured: true,
        removable: true,
        apiKeyEnv: 'AZURE_OPENAI_API_KEY',
        credential: { configured: true, writable: true },
      }]
      state.groups = [{
        id: 'azure-openai-responses', name: 'Azure OpenAI',
        models: [{ id: 'gpt-azure', name: 'Azure GPT', inputModalities: ['text'] }],
      }]
    })
    render(<ModelCatalogSection
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
      api={{} as never}
      t={key => en[key]}
    />)
    expect(screen.getByText('Azure GPT')).toBeTruthy()
  })
})
