/**
 * Watch-build for client-plugin HMR: runs every `dsh.client` plugin package
 * through the tsdown JS API in watch mode. Reload signaling is not this
 * script's business — the host webserver stat-polls the bundles it serves and
 * broadcasts `rebuilt` frames itself (`dsh web`), so any process that
 * rewrites `lib/client.js` files triggers reloads; this script is merely the
 * convenient way to keep them all rebuilt on source change.
 *
 * Usage: `pnpm exec tsx scripts/dev-web.ts [--poll[=ms]]`. Requires the
 * packages' node halves built once (`tsc -b tsconfig.build.json`): the lib
 * config's entries are tsc output. `--poll` switches the source-file watcher
 * to polling (default 500ms): network mounts (weka) deliver no inotify
 * events, so native watching sees the initial build only and never a source
 * change.
 *
 * Each package keeps its own tsdown.config.ts untouched: this script layers
 * `watch` through API-level inline config (tsdown workspace mode fills inline
 * keys under each package's file config, and no package config defines it).
 */
import { globSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildWithConfigs, resolveUserConfig } from 'tsdown'
import type { BuildContext, InlineConfig, TsdownBundle, UserConfig, UserConfigExport } from 'tsdown'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Discover the watch workspace by declaration: every packages/<group>/<name>
 * whose package.json carries `dsh.client` with platform "web" is a client
 * plugin bundle emitter. Scanned once at startup — a package added while
 * watching means restarting this script.
 * @param root - repository root containing the grouped package directories.
 * @returns workspace-relative plugin package directories.
 */
export function discoverPluginDirs(root = repoRoot): string[] {
  const dirs: string[] = []
  for (const manifestPath of globSync('packages/*/*/package.json', { cwd: root }).sort()) {
    const manifest = JSON.parse(readFileSync(join(root, manifestPath), 'utf8')) as {
      dsh?: { client?: { platform?: unknown } }
    }
    if (manifest.dsh?.client?.platform === 'web') dirs.push(dirname(manifestPath).split(sep).join('/'))
  }
  return dirs
}

/**
 * Start the tsdown watch build used by `pnpm run dev:web`.
 * @param root - repository or fixture root passed to tsdown.
 * @param pluginDirs - workspace-relative package directories to watch.
 * @param pollInterval - optional source-watcher polling interval in milliseconds.
 * @returns live bundles after every watcher has completed its initial build.
 */
export async function watchClientPlugins(
  root: string,
  pluginDirs: readonly string[],
  pollInterval?: number,
): Promise<TsdownBundle[]> {
  let resolveInitialBuilds: (() => void) | undefined
  const initialBuilds = new Promise<void>((resolve) => { resolveInitialBuilds = resolve })
  const initialized = new WeakSet<object>()
  const readiness = { expectedBuilds: 0, initializedBuilds: 0 }
  const configDeps = new Set<string>()
  const inlineConfig: InlineConfig = { watch: true }
  const userConfigs = (await Promise.all(pluginDirs.map(async (pluginDir): Promise<UserConfig[]> => {
    const packageRoot = resolve(root, pluginDir)
    const configPath = join(packageRoot, 'tsdown.config.ts')
    configDeps.add(configPath)

    // This script already runs under tsx. Importing package configs directly
    // avoids both Node 22.22's native no-cache loader bug and tsdown's isolated
    // tsx loader cost (roughly 30 seconds per config in this workspace).
    const module = await import(pathToFileURL(configPath).href) as { default: UserConfigExport }
    const loaded = await module.default
    const exported = typeof loaded === 'function'
      ? await loaded({ ...inlineConfig, cwd: packageRoot }, { ci: process.env.CI === 'true' })
      : loaded
    const configs = Array.isArray(exported) ? exported : [exported]

    // clientBundle() also declares the package's Node library build. HMR only
    // serves lib/client.js, so watching the Node half doubles watcher count and
    // can rewrite unrelated artifacts without improving browser reloads.
    const browserConfigs = configs.filter(config => config.platform === 'browser')
    if (browserConfigs.length !== 1) {
      throw new Error(
        `dev-web: expected one browser config from ${pluginDir}/tsdown.config.ts, found ${String(browserConfigs.length)}`,
      )
    }
    return browserConfigs.map(config => ({
      ...config,
      cwd: config.cwd === undefined ? packageRoot : resolve(packageRoot, config.cwd),
      watch: true,
      hooks: Object.assign({}, config.hooks, {
        'build:done': ({ options }: BuildContext) => {
          if (initialized.has(options)) return
          initialized.add(options)
          readiness.initializedBuilds += 1
          if (readiness.initializedBuilds >= readiness.expectedBuilds) resolveInitialBuilds?.()
        },
      }),
      ...pollInterval === undefined
        ? {}
        : {
          inputOptions: Object.assign({}, config.inputOptions, {
            watch: { watcher: { usePolling: true, pollInterval } },
          }),
        },
    }))
  }))).flat()
  const resolvedConfigs = (await Promise.all(
    userConfigs.map(config => resolveUserConfig(config, inlineConfig, configDeps)),
  )).flat()
  readiness.expectedBuilds = resolvedConfigs.length
  const bundles = await buildWithConfigs(resolvedConfigs, configDeps, () => undefined)
  if (readiness.initializedBuilds >= readiness.expectedBuilds) resolveInitialBuilds?.()
  await initialBuilds
  return bundles
}

const invokedPath = process.argv[1]
const isMain = invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href
if (isMain) {
  const pluginDirs = discoverPluginDirs()
  if (pluginDirs.length === 0) {
    console.error('dev-web: no dsh.client (platform "web") packages found under packages/')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const pollArg = args.find(a => a === '--poll' || a.startsWith('--poll='))
  if (args.some(a => a !== pollArg)) {
    console.error('dev-web: usage: tsx scripts/dev-web.ts [--poll[=ms]]')
    process.exit(1)
  }
  const pollInterval = pollArg === undefined ? undefined : Number(pollArg.split('=')[1] ?? '500')
  if (pollInterval !== undefined && (!Number.isInteger(pollInterval) || pollInterval <= 0)) {
    console.error(`dev-web: invalid --poll interval "${pollArg ?? ''}"`)
    process.exit(1)
  }

  await watchClientPlugins(repoRoot, pluginDirs, pollInterval)
  console.log(
    `dev-web: watching ${String(pluginDirs.length)} dsh.client plugin packages`
    + `${pollInterval !== undefined ? ` (polling ${String(pollInterval)}ms)` : ''}:\n  ${pluginDirs.join('\n  ')}`,
  )
}
