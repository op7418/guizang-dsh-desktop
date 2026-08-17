import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'

const appRoot = resolve(import.meta.dirname, '..')

test('Linux packages use an RPM-safe identity and a valid maintainer', async () => {
  const builderConfig = await readFile(resolve(appRoot, 'electron-builder.yml'), 'utf8')
  const packageJson = JSON.parse(await readFile(resolve(appRoot, 'package.json'), 'utf8')) as {
    author?: { name?: string; email?: string }
  }

  assert.match(builderConfig, /^executableName: pilot-harness$/m)
  assert.match(builderConfig, /^  syncDesktopName: true$/m)
  assert.match(builderConfig, /^deb:\n  packageName: pilot-harness$/m)
  assert.match(builderConfig, /^rpm:\n  packageName: pilot-harness$/m)
  assert.equal(packageJson.author?.name, 'Pilot Harness Contributors')
  assert.match(packageJson.author?.email ?? '', /@users\.noreply\.github\.com$/)
})
