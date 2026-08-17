/** Published dsh web + pnpm dev:web → browser HMR, with no page reload. */

import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import { REPO_ROOT } from './support.ts'

function spawnSpec(argv: readonly string[], cwd: string, env?: Record<string, string>): SubprocessSpawnSpec {
  return {
    argv,
    cwd,
    stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
    graceMs: 5_000,
    ...env === undefined ? {} : { env },
  }
}

function waitForOutput(child: SubprocessHandle, pattern: RegExp, label: string): Promise<string> {
  return new Promise((resolveReady, reject) => {
    let output = ''
    let settled = false
    const cleanup = (): void => {
      clearTimeout(timer)
      child.stdout?.off('data', onData)
      child.stderr?.off('data', onData)
    }
    const resolveOnce = (value: string): void => {
      if (settled) return
      settled = true
      cleanup()
      resolveReady(value)
    }
    const rejectOnce = (error: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const onData = (chunk: Buffer): void => {
      output += chunk.toString()
      const match = pattern.exec(output)
      if (match === null) return
      resolveOnce(match[1] ?? match[0])
    }
    const timer = setTimeout(() => { rejectOnce(new Error(`${label} not ready:\n${output}`)) }, 60_000)
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    void child.done.then((outcome) => {
      rejectOnce(new Error(`${label} exited before ready (${JSON.stringify(outcome)}):\n${output}`))
    }, (error: unknown) => {
      rejectOnce(new Error(`${label} failed before ready:\n${output}`, { cause: error }))
    })
  })
}

async function stopTree(child: SubprocessHandle): Promise<void> {
  child.terminate()
  const stopped = await child.waitForExit(AbortSignal.timeout(15_000))
  if (!stopped) throw new Error(`process tree ${String(child.pid)} did not stop after termination escalation`)
  await child.done
}

it('hot-reloads a real client-plugin source edit without refreshing the page', async () => {
  const world = await mkdtemp(join(tmpdir(), 'dsh-web-hmr-world-'))
  const sourcePath = join(REPO_ROOT, 'packages/client/ui-conversation/src/client/locales.ts')
  const bundlePath = join(REPO_ROOT, 'packages/client/ui-conversation/lib/client.js')
  const binPath = join(REPO_ROOT, 'apps/cli/lib/bin.js')
  if (!existsSync(binPath)) throw new Error('HMR browser test needs the built dsh bin; run pnpm run build first')
  const originalSource = await readFile(sourcePath)
  const originalBundle = await readFile(bundlePath)
  const oldText = 'Pilot Harness'
  const sourceNeedle = "'hero.headline': 'Pilot Harness'"
  const newText = `HMR UPDATED ${'x'.repeat(80)}`
  const sourceText = originalSource.toString()
  const englishDictionary = sourceText.indexOf('export const en =')
  const headline = sourceText.indexOf(sourceNeedle, englishDictionary)
  if (englishDictionary === -1 || headline === -1) {
    throw new Error(`HMR English dictionary lacks ${JSON.stringify(sourceNeedle)}`)
  }
  const updatedSource = `${sourceText.slice(0, headline)}'hero.headline': '${newText}'${sourceText.slice(headline + sourceNeedle.length)}`

  const subprocessCtx = new Context()
  let subprocessFiber: Fiber | undefined
  let watcher: SubprocessHandle | undefined
  let host: SubprocessHandle | undefined
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  const failures: unknown[] = []
  try {
    subprocessFiber = await subprocessCtx.plugin(LocalSubprocessRuntime)
    watcher = subprocessCtx.subprocess.spawn(spawnSpec(['pnpm', 'run', 'dev:web'], REPO_ROOT))
    await waitForOutput(watcher, /dev-web: watching/, 'pnpm run dev:web')
    host = subprocessCtx.subprocess.spawn(spawnSpec(
      [process.execPath, binPath, 'web', '--port', '0'],
      world,
      {
        DEEPSEEK_API_KEY: 'keyless-hmr-no-call',
        DSH_HOME: join(world, '.dsh'),
      },
    ))
    const baseUrl = await waitForOutput(host, /dsh web: (http:\/\/[^\s]+)/, 'built dsh web')
    browser = await chromium.launch()
    const page = await browser.newPage()
    const pageErrors: string[] = []
    const consoleMessages: string[] = []
    const eventRequests: string[] = []
    const conversationBundleRequests: string[] = []
    page.on('pageerror', error => pageErrors.push(String(error)))
    page.on('console', message => consoleMessages.push(`[${message.type()}] ${message.text()}`))
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.pathname === '/plugins/events') eventRequests.push(request.url())
      if (url.pathname === '/plugins/@deepseek-ai/dsh-client-ui-conversation/client.js') {
        conversationBundleRequests.push(request.url())
      }
    })
    await page.goto(baseUrl, { waitUntil: 'load' })
    await page.getByText(oldText, { exact: true }).waitFor({ timeout: 15_000 })
    await page.evaluate(() => new Promise<void>((resolveReady, reject) => {
      const win = window as Window & {
        __dshHmrProbe?: EventSource
        __dshHmrFrames?: unknown[]
      }
      const source = new EventSource('/plugins/events')
      win.__dshHmrProbe = source
      win.__dshHmrFrames = []
      const timer = setTimeout(() => { reject(new Error('HMR SSE probe did not receive its graph frame')) }, 5_000)
      source.addEventListener('message', (event: MessageEvent<string>) => {
        const frame = JSON.parse(event.data) as { type?: string }
        win.__dshHmrFrames?.push(frame)
        if (frame.type !== 'graph') return
        clearTimeout(timer)
        resolveReady()
      })
    }))
    expect(eventRequests.length).toBeGreaterThanOrEqual(2)
    const moduleIdentity = await page.evaluate(() => {
      const identity = crypto.randomUUID()
      const win = window as Window & {
        __DSH_MODULES__?: { loadCache: Map<string, { exports: object }> }
      }
      const exports = win.__DSH_MODULES__?.loadCache.get('@deepseek-ai/dsh-client-ui-conversation')?.exports
      if (exports === undefined) throw new Error('conversation module was not materialized before HMR probe')
      Object.defineProperty(exports, '__dshHmrModuleIdentity', { value: identity })
      return identity
    })
    const pageIdentity = await page.evaluate(() => {
      const identity = crypto.randomUUID()
      Object.defineProperty(window, '__dshHmrPageIdentity', { value: identity })
      return identity
    })

    await writeFile(sourcePath, updatedSource)
    await expect.poll(async () => page.evaluate(() => {
      const frames = (window as Window & { __dshHmrFrames?: Array<{ type?: string; id?: string }> }).__dshHmrFrames ?? []
      return frames.some(frame => frame.type === 'rebuilt' && frame.id === '@deepseek-ai/dsh-client-ui-conversation')
    }), { timeout: 10_000 }).toBe(true)
    const rebuiltRev = await page.evaluate(() => {
      const frames = (window as Window & {
        __dshHmrFrames?: Array<{ type?: string; id?: string; rev?: string }>
      }).__dshHmrFrames ?? []
      return frames.findLast(frame =>
        frame.type === 'rebuilt' && frame.id === '@deepseek-ai/dsh-client-ui-conversation')?.rev
    })
    await expect.poll(() => conversationBundleRequests.some(url => url.includes(`rev=${rebuiltRev ?? ''}`)), {
      timeout: 10_000,
      message: `browser HMR did not request rebuilt conversation bundle; requests=${JSON.stringify(conversationBundleRequests)}`,
    }).toBe(true)
    await expect.poll(async () => page.evaluate(({ identity }) => {
      const win = window as Window & {
        __DSH_MODULES__?: { loadCache: Map<string, { exports: { __dshHmrModuleIdentity?: string } }> }
      }
      const exports = win.__DSH_MODULES__?.loadCache.get('@deepseek-ai/dsh-client-ui-conversation')?.exports
      return exports !== undefined && exports.__dshHmrModuleIdentity !== identity
    }, { identity: moduleIdentity }), {
      timeout: 10_000,
      message: 'browser HMR downloaded the rebuilt bundle but did not materialize a replacement module record',
    }).toBe(true)
    await page.getByText(newText, { exact: true }).waitFor({ timeout: 30_000 }).catch(async (error: unknown) => {
      const frames = await page.evaluate(() => {
        const all = (window as Window & {
          __dshHmrFrames?: Array<{ type?: string; id?: string; rev?: string; graph?: { rev?: string } }>
        }).__dshHmrFrames ?? []
        return all.map(frame => frame.type === 'graph'
          ? { type: frame.type, rev: frame.graph?.rev }
          : { type: frame.type, id: frame.id, rev: frame.rev })
      })
      throw new Error(
        `HMR UI did not update\nframes=${JSON.stringify(frames)}\npageErrors=${JSON.stringify(pageErrors)}\nconsole=${JSON.stringify(consoleMessages)}`,
        { cause: error },
      )
    })
    expect(await page.evaluate(() => (window as Window & { __dshHmrPageIdentity?: string }).__dshHmrPageIdentity))
      .toBe(pageIdentity)
    expect(pageErrors).toEqual([])
  } catch (error) {
    failures.push(error)
  } finally {
    await writeFile(sourcePath, originalSource).catch((error: unknown) => failures.push(error))
    if (watcher !== undefined) await stopTree(watcher).catch((error: unknown) => failures.push(error))
    await writeFile(bundlePath, originalBundle).catch((error: unknown) => failures.push(error))
    if (host !== undefined) await stopTree(host).catch((error: unknown) => failures.push(error))
    await browser?.close().catch((error: unknown) => failures.push(error))
    await subprocessFiber?.dispose().catch((error: unknown) => failures.push(error))
    await rm(world, { recursive: true, force: true }).catch((error: unknown) => failures.push(error))
  }
  if (failures.length > 0) throw new AggregateError(failures, 'HMR browser test or cleanup failed')
}, 120_000)
