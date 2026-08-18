// @vitest-environment jsdom
/** Vendor-neutral first-run provider guidance over the shared Models join. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RpcResponse } from '@deepseek-ai/dsh-api-remotes/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { ProviderOnboardingDialog } from '../src/client/ProviderOnboardingDialog.tsx'
import type { ProviderOnboardingDialogProps } from '../src/client/ProviderOnboardingDialog.tsx'
import { ModelsSettingsStore } from '../src/client/store.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  document.getElementById('root')?.remove()
})

let nextRpc = 0
function ok<T>(value: T): RpcResponse<T> {
  return { rpcId: `provider-onboarding-${nextRpc++}` as never, result: { ok: true, value } }
}

function harness(options: { providerReady?: boolean; writable?: boolean; fail?: boolean } = {}) {
  const appRoot = document.createElement('div')
  appRoot.id = 'root'
  document.body.append(appRoot)
  const face = {
    llm: {
      providers: () => options.fail === true
        ? Promise.reject(new Error('provider directory unavailable'))
        : Promise.resolve(ok({
          providers: options.providerReady === true
            ? [{
              provider: 'local-runtime', displayName: 'Local Runtime',
              settingsNs: '', settingsPath: [], active: true,
            }]
            : [],
        })),
    },
    settings: {
      describe: () => Promise.resolve(ok({
        writable: options.writable ?? true,
        hasDocument: false,
        namespaces: [],
      })),
    },
    credentials: {
      describe: () => Promise.resolve(ok({ credentials: {} })),
    },
  }
  const controller = new ModelsSettingsStore(face as never)
  const complete = vi.fn()
  const openSection = vi.fn()
  const unusedHook = (() => { throw new Error('unused standard hook') }) as never
  const props: ProviderOnboardingDialogProps = {
    stepId: 'provider-setup',
    complete,
    openSection,
    useSessions: unusedHook,
    useWorkspaces: unusedHook,
    controller,
    useModels: bindSnapshotSelector(controller.store),
    api: face as never,
    t: key => en[key],
  }
  return { appRoot, complete, openSection, props }
}

describe('ProviderOnboardingDialog', () => {
  it('offers provider setup when no usable provider exists', async () => {
    const h = harness()
    render(<ProviderOnboardingDialog {...h.props} />)
    expect(await screen.findByRole('dialog', { name: en.onboardingTitle })).toBeTruthy()
    expect(screen.getByText(en.onboardingDescription)).toBeTruthy()
    expect(h.appRoot.inert).toBe(true)
  })

  it('opens the Providers page and completes the prompt', async () => {
    const h = harness()
    render(<ProviderOnboardingDialog {...h.props} />)
    fireEvent.click(await screen.findByRole('button', { name: en.onboardingOpenProviders }))
    expect(h.openSection).toHaveBeenCalledOnce()
    expect(h.openSection).toHaveBeenCalledWith('providers')
    expect(h.complete).toHaveBeenCalledOnce()
  })

  it('can be skipped without opening settings', async () => {
    const h = harness()
    render(<ProviderOnboardingDialog {...h.props} />)
    fireEvent.click(await screen.findByRole('button', { name: en.onboardingLater }))
    expect(h.complete).toHaveBeenCalledOnce()
    expect(h.openSection).not.toHaveBeenCalled()
  })

  it('waits for an existing dialog instead of replacing its active flow', async () => {
    const blocker = document.createElement('div')
    blocker.setAttribute('role', 'dialog')
    blocker.setAttribute('aria-label', 'Select Workspace Directory')
    document.body.append(blocker)
    const h = harness()
    render(<ProviderOnboardingDialog {...h.props} />)

    await waitFor(() => { expect(h.props.controller.store.getSnapshot().status).toBe('ready') })
    expect(screen.queryByRole('dialog', { name: en.onboardingTitle })).toBeNull()
    expect(h.appRoot.inert).not.toBe(true)

    blocker.remove()
    expect(await screen.findByRole('dialog', { name: en.onboardingTitle })).toBeTruthy()
    expect(h.appRoot.inert).toBe(true)
  })

  it('does not block an already configured or unavailable installation', async () => {
    for (const h of [
      harness({ providerReady: true }),
      harness({ writable: false }),
      harness({ fail: true }),
    ]) {
      const view = render(<ProviderOnboardingDialog {...h.props} />)
      await waitFor(() => { expect(h.complete).toHaveBeenCalledOnce() })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(h.openSection).not.toHaveBeenCalled()
      view.unmount()
    }
  })
})
