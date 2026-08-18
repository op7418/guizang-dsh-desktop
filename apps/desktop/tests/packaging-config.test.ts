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

test('online previews are ad-hoc signed while tagged releases require Developer ID', async () => {
  const [builderConfig, adhocConfig, packageJson, workflow, rootReadme, rootReadmeZh] = await Promise.all([
    readFile(resolve(appRoot, 'electron-builder.yml'), 'utf8'),
    readFile(resolve(appRoot, 'electron-builder.adhoc.yml'), 'utf8'),
    readFile(resolve(appRoot, 'package.json'), 'utf8'),
    readFile(resolve(appRoot, '../../.github/workflows/desktop.yml'), 'utf8'),
    readFile(resolve(appRoot, '../../README.md'), 'utf8'),
    readFile(resolve(appRoot, '../../README.zh.md'), 'utf8'),
  ])

  assert.doesNotMatch(builderConfig, /^  identity: null$/m)
  assert.match(builderConfig, /^afterSign: scripts\/after-sign\.cjs$/m)
  assert.match(builderConfig, /^  hardenedRuntime: true$/m)
  assert.match(builderConfig, /^  entitlements: assets\/entitlements\.mac\.plist$/m)
  assert.match(builderConfig, /^  entitlementsInherit: assets\/entitlements\.mac\.inherit\.plist$/m)
  assert.match(adhocConfig, /^extends: \.\/electron-builder\.yml$/m)
  assert.match(adhocConfig, /^  identity: "-"$/m)

  const scripts = (JSON.parse(packageJson) as { scripts?: Record<string, string> }).scripts ?? {}
  assert.match(scripts.pack ?? '', /electron-builder\.adhoc\.yml/)
  assert.match(scripts['pack:release'] ?? '', /electron-builder\.yml/)
  assert.match(workflow, /CSC_LINK: \$\{\{ secrets\.MAC_CERT_P12_BASE64 \}\}/)
  assert.match(workflow, /CSC_KEY_PASSWORD: \$\{\{ secrets\.MAC_CERT_PASSWORD \}\}/)
  assert.match(workflow, /PILOT_HARNESS_APPLE_TEAM_ID: \$\{\{ secrets\.APPLE_TEAM_ID \}\}/)
  assert.match(workflow, /PILOT_HARNESS_REQUIRE_DEVELOPER_ID: '1'/)
  assert.match(workflow, /verify-macos-signature\.mjs apps\/desktop\/release 1/)
  assert.match(
    workflow,
    /github\.event_name == 'workflow_dispatch' && runner\.os == 'macOS'/,
  )
  assert.match(workflow, /ulimit -n 1048575/)
  assert.match(workflow, /desktop package version \$actual does not match tag \$GITHUB_REF_NAME/)
  assert.match(workflow, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/)
  assert.match(workflow, /> release-assets\/SHA256SUMS\.txt/)
  assert.match(workflow, /release-assets\/SHA256SUMS\.txt/)
  assert.doesNotMatch(rootReadme, /pnpm run desktop:pack/)
  assert.doesNotMatch(rootReadmeZh, /pnpm run desktop:pack/)
  assert.match(rootReadme, /never built or uploaded from a developer machine/)
  assert.match(rootReadmeZh, /不会在开发者电脑上构建或上传/)
})
