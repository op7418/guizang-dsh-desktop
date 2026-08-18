import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'

const appRoot = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

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

test('online previews are ad-hoc signed while formal releases require Developer ID', async () => {
  const [builderConfig, adhocConfig, packageJson, workflow, upstreamWorkflow, upstreamState, rootReadme, rootReadmeZh] = await Promise.all([
    readFile(resolve(appRoot, 'electron-builder.yml'), 'utf8'),
    readFile(resolve(appRoot, 'electron-builder.adhoc.yml'), 'utf8'),
    readFile(resolve(appRoot, 'package.json'), 'utf8'),
    readFile(resolve(appRoot, '../../.github/workflows/desktop.yml'), 'utf8'),
    readFile(resolve(appRoot, '../../.github/workflows/upstream-sync.yml'), 'utf8'),
    readFile(resolve(appRoot, '../../.github/upstream.json'), 'utf8'),
    readFile(resolve(appRoot, '../../README.md'), 'utf8'),
    readFile(resolve(appRoot, '../../README.zh.md'), 'utf8'),
  ])

  assert.doesNotMatch(builderConfig, /^  identity: null$/m)
  assert.match(builderConfig, /^afterSign: scripts\/after-sign\.cjs$/m)
  assert.match(builderConfig, /^  sign: \.\/scripts\/native-macos-sign\.cjs$/m)
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
    /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
  )
  assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.release_tag == ''/)
  assert.match(workflow, /runner\.os == 'macOS'/)
  assert.match(
    workflow,
    /- name: Verify macOS artifact signature\n\s+if: \$\{\{[^\n]*github\.event_name == 'push'/,
  )
  assert.doesNotMatch(workflow, /ulimit -n/)
  assert.match(workflow, /desktop package version \$actual does not match tag \$RELEASE_TAG/)
  assert.match(workflow, /inputs\.release_tag != ''/)
  assert.match(workflow, /tag_name: \$\{\{ startsWith\(github\.ref/)
  assert.match(workflow, /> release-assets\/SHA256SUMS\.txt/)
  assert.match(workflow, /release-assets\/SHA256SUMS\.txt/)
  assert.doesNotMatch(rootReadme, /pnpm run desktop:pack/)
  assert.doesNotMatch(rootReadmeZh, /pnpm run desktop:pack/)
  assert.match(rootReadme, /never built or uploaded from a developer machine/)
  assert.match(rootReadmeZh, /不会在开发者电脑上构建或上传/)
  assert.match(builderConfig, /^  notarize: false$/m)
  assert.match(rootReadme, /formal Release is published only after its Developer ID signature has been verified/)
  assert.match(rootReadme, /System Settings → Privacy & Security/)
  assert.match(rootReadme, /Do not run `xattr` or disable Gatekeeper/)
  assert.match(rootReadme, /Preview macOS artifacts are ad-hoc signed/)
  assert.match(rootReadmeZh, /正式 Release 只有在 Developer ID 签名校验通过后才会发布/)
  assert.match(rootReadmeZh, /系统设置 → 隐私与安全性/)
  assert.match(rootReadmeZh, /正式 Release 不需要执行 `xattr`/)
  assert.match(rootReadmeZh, /macOS 预览产物仅使用临时签名/)

  const tracked = JSON.parse(upstreamState) as { repository?: string; tag?: string; commit?: string; pilotVersion?: string }
  assert.equal(tracked.repository, 'deepseek-ai/deepseek-harness')
  assert.match(tracked.tag ?? '', /^dsh-v/)
  assert.match(tracked.commit ?? '', /^[0-9a-f]{40}$/)
  assert.match(tracked.pilotVersion ?? '', /-pilot\.1$/)
  assert.match(upstreamWorkflow, /cron: '0 1 \* \* \*'/)
  assert.match(upstreamWorkflow, /git merge --no-ff --no-edit/)
  assert.match(upstreamWorkflow, /git diff --name-only --diff-filter=U/)
  assert.match(upstreamWorkflow, /git push origin HEAD:main/)
  assert.doesNotMatch(upstreamWorkflow, /git push[^\n]*--force/)
  assert.match(upstreamWorkflow, /gh workflow run desktop\.yml/)
  assert.match(upstreamWorkflow, /MAC_CERT_P12_BASE64/)
})

test('native macOS signing delegates recursive traversal to codesign', () => {
  const signer = require(resolve(appRoot, 'scripts/native-macos-sign.cjs')) as {
    buildCodesignArgs: (
      options: { app: string; identity: string; keychain?: string },
      fileOptions: Record<string, unknown>,
    ) => string[]
  }
  const app = '/tmp/Pilot Harness.app'
  const entitlements = '/tmp/entitlements.mac.plist'

  const adhoc = signer.buildCodesignArgs(
    { app, identity: '-' },
    { entitlements, hardenedRuntime: true },
  )
  assert.deepEqual(adhoc.slice(0, 5), ['--force', '--deep', '--verbose=4', '--sign', '-'])
  assert.ok(adhoc.includes('--timestamp=none'))
  assert.deepEqual(adhoc.slice(-3), ['--entitlements', entitlements, app])
  assert.match(adhoc[adhoc.indexOf('--options') + 1] ?? '', /(?:^|,)runtime(?:,|$)/)

  const developerId = signer.buildCodesignArgs(
    { app, identity: 'ABC123', keychain: '/tmp/build.keychain' },
    { signatureFlags: ['library'], timestamp: 'https://timestamp.example.test' },
  )
  assert.ok(developerId.includes('--deep'))
  assert.ok(developerId.includes('--keychain'))
  assert.ok(developerId.includes('--timestamp=https://timestamp.example.test'))
  assert.equal(developerId[developerId.indexOf('--options') + 1], 'library')
})
