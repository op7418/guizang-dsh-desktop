/**
 * CodePilot-style model inventory over the live adapter catalog. Provider
 * credentials stay on the sibling Providers page; this page is deliberately
 * about choosing and understanding models, including multimodal capability.
 */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { CodePilotIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import { renderModelsSection } from './ModelsSection.tsx'
import type { ModelsSectionInjected, ModelsSectionProps } from './ModelsSection.tsx'
import type { ModelsSettingsStore, ModelsSettingsState } from './store.ts'
import { messageOf } from './store.ts'
import { isCodePilotProvider } from './CodePilotProviderCatalog.ts'
import { ProviderBrandIcon } from './ProviderBrandIcon.tsx'
import styles from './ModelCatalogSection.module.css'

type CatalogFilter = 'all' | 'multimodal' | 'reasoning'
type ModelCatalogModel = ModelsSettingsState['groups'][number]['models'][number] & {
  inputModalities?: string[]
}

/** Persist the model used by newly created sessions. */
export async function saveDefaultModel(
  api: Pick<IApiClient, 'settings'>,
  controller: ModelsSettingsStore,
  state: ModelsSettingsState,
  provider: string,
  model: string,
): Promise<string | undefined> {
  const namespace = state.namespaces.get('agent-default-model')
  if (namespace === undefined) return 'agent-default-model settings are unavailable'
  try {
    const response = await api.settings.mutate({
      ns: namespace.ns,
      expectedRevision: namespace.revision,
      ops: [
        { op: 'set', path: ['provider'], value: provider },
        { op: 'set', path: ['model'], value: model },
        { op: 'unset', path: ['reasoningEffort'] },
      ],
    })
    if (!response.result.ok) return response.result.error.message
  } catch (error) {
    return messageOf(error)
  }
  await controller.load()
  return undefined
}

function supportsImage(model: ModelCatalogModel): boolean {
  return model.inputModalities?.includes('image') === true
}

function matchesFilter(model: ModelCatalogModel, filter: CatalogFilter): boolean {
  if (filter === 'multimodal') return supportsImage(model)
  if (filter === 'reasoning') return model.reasoning !== undefined
  return true
}

/** Model catalog settings section registered beside Providers. */
export function ModelCatalogSection(props: ModelsSectionProps): ReactNode {
  return renderModelsSection(props, injected => <Loaded injected={injected} />)
}

function Loaded({ injected }: { injected: ModelsSectionInjected }): ReactNode {
  const { controller, api, t } = injected
  const state = injected.useSnapshot(snapshot => snapshot)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CatalogFilter>('all')
  const [saving, setSaving] = useState<string | undefined>()
  const [failure, setFailure] = useState<string | undefined>()

  if (state.status === 'idle') void controller.load()

  const normalized = query.trim().toLocaleLowerCase()
  const declaredProviders = useMemo(() => new Set(
    state.rows.filter(row => row.entry.declared === true).map(row => row.entry.provider),
  ), [state.rows])
  const configuredProviders = useMemo(() => new Set(
    state.rows.filter(row => row.configured).map(row => row.entry.provider),
  ), [state.rows])
  const sourceGroups = useMemo(
    () => state.groups.filter(group => configuredProviders.has(group.id)
      || isCodePilotProvider(group.id, declaredProviders.has(group.id))),
    [configuredProviders, declaredProviders, state.groups],
  )
  const groups = useMemo(() => sourceGroups.flatMap((group) => {
    const models = group.models.filter((model) => {
      if (!matchesFilter(model, filter)) return false
      if (normalized === '') return true
      return `${group.name} ${group.id} ${model.name} ${model.id} ${model.description ?? ''}`
        .toLocaleLowerCase()
        .includes(normalized)
    })
    return models.length === 0 ? [] : [{ ...group, models }]
  }), [filter, normalized, sourceGroups])

  const setDefault = (provider: string, model: string): void => {
    const key = `${provider}/${model}`
    setSaving(key)
    setFailure(undefined)
    void saveDefaultModel(api, controller, state, provider, model)
      .then((error) => { if (error !== undefined) setFailure(error) })
      .finally(() => { setSaving(undefined) })
  }

  return (
    <section className={styles.section}>
      <header className={styles.heading}>
        <div>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.intro}>{t('modelIntro')}</p>
        </div>
        <span className={styles.summary}>
          {t('modelSummary')
            .replace('{providers}', String(sourceGroups.length))
            .replace('{models}', String(sourceGroups.reduce((count, group) => count + group.models.length, 0)))}
        </span>
      </header>

      <div className={styles.toolbar} data-pilot-model-toolbar>
        <label className={styles.search} data-pilot-model-search>
          <CodePilotIcon name="search" size={14} />
          <input
            value={query}
            placeholder={t('searchModels')}
            aria-label={t('searchModels')}
            onChange={(event) => { setQuery(event.target.value) }}
          />
        </label>
        <div className={styles.filters} role="group" aria-label={t('filterModels')} data-pilot-model-filters>
          {(['all', 'multimodal', 'reasoning'] as const).map(value => (
            <button
              key={value}
              type="button"
              className={filter === value ? styles.filterActive : styles.filter}
              aria-pressed={filter === value}
              onClick={() => { setFilter(value) }}
            >
              {t(value === 'all' ? 'filterAll' : value === 'multimodal' ? 'filterMultimodal' : 'filterReasoning')}
            </button>
          ))}
        </div>
      </div>

      {state.catalogError === null ? null : <p className={styles.error}>{state.catalogError}</p>}
      {failure === undefined ? null : <p className={styles.error} role="alert">{failure}</p>}
      {state.status === 'loading' && sourceGroups.length === 0
        ? <p className={styles.empty}>{t('loadingModels')}</p>
        : null}
      {state.status === 'error'
        ? (
          <div className={styles.empty}>
            <p>{state.error}</p>
            <button type="button" onClick={() => { void controller.load() }}>{t('retry')}</button>
          </div>
        )
        : null}

      <div className={styles.groups}>
        {groups.map(group => (
          <details key={group.id} className={styles.group} data-pilot-model-group open>
            <summary className={styles.groupSummary}>
              <span className={styles.providerMark} aria-hidden="true">
                <ProviderBrandIcon provider={group.id} displayName={group.name} size={16} />
              </span>
              <span className={styles.providerName}>{group.name}</span>
              <span className={styles.providerId}>{group.id}</span>
              <span className={styles.modelCount}>{group.models.length}</span>
            </summary>
            <div className={styles.modelList} data-pilot-model-list>
              {group.models.map((model) => {
                const key = `${group.id}/${model.id}`
                const active = state.defaultModel?.provider === group.id && state.defaultModel.model === model.id
                return (
                  <article key={model.id} className={styles.modelRow} data-pilot-model-row>
                    <div className={styles.modelIdentity}>
                      <span className={styles.modelName}>{model.name}</span>
                      <span className={styles.modelId}>{model.id}</span>
                      <span className={styles.badges}>
                        {supportsImage(model) ? <span className={styles.badge}>{t('multimodal')}</span> : null}
                        {model.reasoning !== undefined ? <span className={styles.badge}>{t('reasoning')}</span> : null}
                      </span>
                      {model.description === undefined ? null : <span className={styles.description}>{model.description}</span>}
                    </div>
                    <button
                      type="button"
                      className={active ? styles.defaultActive : styles.defaultButton}
                      disabled={!state.writable || saving !== undefined}
                      aria-label={`${t(active ? 'defaultModel' : 'setDefault')} ${model.name}`}
                      onClick={() => { if (!active) setDefault(group.id, model.id) }}
                    >
                      {active ? <CodePilotIcon name="success" size={12} /> : null}
                      {saving === key ? t('savingDefault') : t(active ? 'defaultModel' : 'setDefault')}
                    </button>
                  </article>
                )
              })}
            </div>
          </details>
        ))}
      </div>

      {state.catalogFailures.filter(item => configuredProviders.has(item.id)
        || isCodePilotProvider(item.id)).map(item => (
        <p key={item.id} className={styles.catalogFailure}>{`${item.name}: ${item.message}`}</p>
      ))}
      {state.status === 'ready' && groups.length === 0
        ? <p className={styles.empty}>{normalized === '' ? t('noModels') : t('noMatchingModels')}</p>
        : null}
    </section>
  )
}
