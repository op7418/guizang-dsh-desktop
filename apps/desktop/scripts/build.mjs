import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(appRoot, 'dist')

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

const shared = {
  bundle: true,
  external: ['electron'],
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  minify: false,
}

await build({
  ...shared,
  entryPoints: [join(appRoot, 'src/main.ts')],
  format: 'cjs',
  outfile: join(dist, 'main.cjs'),
})

await build({
  ...shared,
  entryPoints: [join(appRoot, 'src/preload.ts')],
  format: 'cjs',
  outfile: join(dist, 'preload.cjs'),
})

for (const asset of ['icon.png', 'brand-icon.png', 'pilot-harness.patch.yml', 'shell.html', 'shell.js']) {
  cpSync(join(appRoot, 'assets', asset), join(dist, asset))
}

console.log('Pilot Harness desktop shell built')
