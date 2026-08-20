/** Models section registration: slot declaration injection, the locale-following label thunk, and HMR recovery. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SettingsScopeBinder } from '@deepseek-ai/dsh-client-ui-settings/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject, refreshIfLoaded } from '@deepseek-ai/dsh-client-ui-settings-models/client'
import { ModelsSection } from '../src/client/ModelsSection.tsx'
import { ModelCatalogSection } from '../src/client/ModelCatalogSection.tsx'
import { ProviderOnboardingDialog } from '../src/client/ProviderOnboardingDialog.tsx'

// The service reads its initial locale from the browser; these specs assert
// the shipped Chinese copy, so they state the browser they assume.
usePinnedBrowserLanguages('zh-CN')

async function bench(isLoopback = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  // The plugins inject `remote`; forwarded events reach them through the
  // same `$dispatch` handoff the connection sink makes.
  new TestRemote(ctx)
  // The apply path only captures the wire face; no call leaves this fake
  // until a section actually loads.
  ctx.provide('connection', { api: {}, isLoopback } as never)
  new SettingsScopeBinder(ctx)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register(
    {
      name: 'root',
      children: {
        'settings.section': { kind: 'list', scope: 'root' },
        'settings.onboarding': { kind: 'list', scope: 'root' },
      },
    } as never,
    () => null,
  )
}

describe('ui-settings-models apply', () => {
  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'remote', 'settingsScope'])
  })

  it('registers the models nav entry for declarations before or after apply', async () => {
    const before = await bench()
    declare(before.slots)
    await before.ctx.plugin({ inject: [...inject], apply }).await()
    const sections = before.slots.entries('settings.section')
    expect(sections).toHaveLength(2)
    const entry = sections.find(row => row.options.id === 'providers')!
    expect(entry.component).toBe(ModelsSection)
    expect(entry.options).toMatchObject({ id: 'providers', order: 10 })
    expect(sections.find(row => row.options.id === 'models')).toMatchObject({
      component: ModelCatalogSection,
      options: { id: 'models', order: 20 },
    })
    // The nav label is a locale-following thunk; owners resolve at read time.
    expect(resolveSlotLabel(entry.options.label)).toBe('服务商')
    const injected = (entry.inject as unknown as () => import('../src/client/ModelsSection.tsx').ModelsSectionInjected)()
    expect(injected.t('providerNav')).toBe('服务商')
    expect(injected.t('deleteTitle')).toBe('删除 {provider}？')
    expect(typeof injected.controller.load).toBe('function')
    expect(typeof injected.useSnapshot).toBe('function')
    expect(injected.api).toBeDefined()
    const onboarding = before.slots.entries('settings.onboarding')
    expect(onboarding).toHaveLength(1)
    expect(onboarding.find(entry => entry.options.id === 'provider-setup')).toMatchObject({
      component: ProviderOnboardingDialog,
      options: { id: 'provider-setup', order: 0 },
    })
    const after = await bench()
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    expect(after.slots.entries('settings.section')).toHaveLength(0)
    expect(after.slots.entries('settings.onboarding')).toHaveLength(0)
    declare(after.slots)
    await Promise.resolve()
    expect(after.slots.entries('settings.section').find(row => row.options.id === 'providers')!.component).toBe(ModelsSection)
    expect(after.slots.entries('settings.onboarding')).toHaveLength(1)
    // The self-inflicted ledger notifications hit the duplicate guard.
    expect(after.slots.entries('settings.section')).toHaveLength(2)
  })

  it('the label thunk follows the active locale without re-registration', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    b.locale.setLocale('en')
    const provider = b.slots.entries('settings.section').find(row => row.options.id === 'providers')!
    const models = b.slots.entries('settings.section').find(row => row.options.id === 'models')!
    expect(resolveSlotLabel(provider.options.label)).toBe('Providers')
    expect(resolveSlotLabel(models.options.label)).toBe('Models')
    const injected = provider.inject as unknown as () => import('../src/client/ModelsSection.tsx').ModelsSectionInjected
    expect(injected().t('deleteTitle')).toBe('Delete {provider}?')
    b.locale.setLocale('zh')
    expect(resolveSlotLabel(provider.options.label)).toBe('服务商')
    expect(resolveSlotLabel(models.options.label)).toBe('模型')
    expect(injected().t('deleteTitle')).toBe('删除 {provider}？')
  })

  it('locale change while the slot is undeclared stays a no-op', async () => {
    const b = await bench()
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    b.locale.setLocale('en')
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    b.locale.setLocale('zh')
  })

  it('re-registers after an HMR collapse re-declares the slot (stale disposer must not block)', async () => {
    const b = await bench()
    const redeclare = declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.slots.entries('settings.section')).toHaveLength(2)
    // Declarer unload: the cascade removes our entry while our local
    // disposer variable goes stale.
    redeclare()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(b.slots.entries('settings.onboarding')).toHaveLength(0)
    declare(b.slots)
    await Promise.resolve()
    expect(b.slots.entries('settings.section').find(row => row.options.id === 'providers')!.component).toBe(ModelsSection)
    expect(b.slots.entries('settings.onboarding')).toHaveLength(1)
    // The locale path also recovers through the same ledger re-check.
    b.locale.setLocale('en')
    expect(resolveSlotLabel(b.slots.entries('settings.section').find(row => row.options.id === 'models')!.options.label)).toBe('Models')
    b.locale.setLocale('zh')
  })

  it('registers the zh/en nav dictionaries and disposes everything with the fiber', async () => {
    const b = await bench()
    declare(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(b.locale.bind('settings.models')('nav')).toBe('模型')
    await fiber.dispose()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(b.slots.entries('settings.onboarding')).toHaveLength(0)
    // The (ns, locale) seats are free again — the dictionary disposers ran.
    expect(() => b.locale.register('settings.models', 'zh', {})).not.toThrow()
    expect(() => b.locale.register('settings.models', 'en', {})).not.toThrow()
  })

})

describe('pushed invalidations', () => {
  it('ignores invalidations before the page ever loaded', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    // The fake wire face has no methods: a fetch attempt would throw.
    b.ctx.remote.$dispatch('settings/document-updated', ['llm-pi-ai', 1])
    b.ctx.remote.$dispatch('credentials/updated', ['OPENAI_API_KEY'])
    b.ctx.remote.$dispatch('llm/adapters-updated', [])
    b.ctx.emit('connection/reset')
  })

  it('refreshes a loaded page and skips an idle one', () => {
    const loads: number[] = []
    const controller = {
      store: { getSnapshot: () => ({ status: 'ready' }) },
      load: () => { loads.push(1); return Promise.resolve() },
    }
    refreshIfLoaded(controller as unknown as import('../src/client/store.ts').ModelsSettingsStore)
    expect(loads).toHaveLength(1)
    const idle = {
      store: { getSnapshot: () => ({ status: 'idle' }) },
      load: () => { loads.push(2); return Promise.resolve() },
    }
    refreshIfLoaded(idle as unknown as import('../src/client/store.ts').ModelsSettingsStore)
    expect(loads).toHaveLength(1)
  })

  it('routes pushed credential invalidation into the shared provider/model join', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const entry = b.slots.entries('settings.section')
      .find(candidate => candidate.options.id === 'providers')!
    const injected = (
      entry.inject as unknown as
      () => import('../src/client/ModelsSection.tsx').ModelsSectionInjected
    )()
    injected.controller.store.update((state) => { state.status = 'ready' })
    const load = vi.spyOn(injected.controller, 'load').mockResolvedValue()
    b.ctx.remote.$dispatch('credentials/updated', ['DEEPSEEK_API_KEY'])
    expect(load).toHaveBeenCalledTimes(1)
  })

})
