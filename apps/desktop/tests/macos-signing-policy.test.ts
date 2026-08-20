import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const appRoot = resolve(import.meta.dirname, '..')
const signingPolicy = require('../scripts/macos-signing-policy.cjs') as {
  resolveMacosSigningMode(input: {
    signatureOutput: string
    requireDeveloperId: boolean
    allowAdhoc: boolean
    expectedTeamId: string
  }): { mode: 'developer_id' | 'adhoc'; teamId: string | null }
}
const resolveMacosSigningMode = (input: Parameters<typeof signingPolicy.resolveMacosSigningMode>[0]) => (
  signingPolicy.resolveMacosSigningMode(input)
)

const developerIdSignature = [
  'CodeDirectory v=20500 size=123 flags=0x10000(runtime) hashes=1+7 location=embedded',
  'Authority=Developer ID Application: Pilot Harness (TEAM123456)',
  'TeamIdentifier=TEAM123456',
].join('\n')

void test('macOS release signatures require the configured Developer ID Team', () => {
  assert.deepEqual(resolveMacosSigningMode({
    signatureOutput: developerIdSignature,
    requireDeveloperId: true,
    allowAdhoc: false,
    expectedTeamId: 'TEAM123456',
  }), { mode: 'developer_id', teamId: 'TEAM123456' })

  assert.throws(() => resolveMacosSigningMode({
    signatureOutput: developerIdSignature,
    requireDeveloperId: true,
    allowAdhoc: false,
    expectedTeamId: 'OTHERTEAM1',
  }), /TeamIdentifier mismatch/)
})

void test('macOS release policy rejects unsigned and ad-hoc artifacts', () => {
  assert.throws(() => resolveMacosSigningMode({
    signatureOutput: 'CodeDirectory flags=0x10000(runtime)\nSignature=adhoc\nTeamIdentifier=not set',
    requireDeveloperId: true,
    allowAdhoc: true,
    expectedTeamId: 'TEAM123456',
  }), /Developer ID Application signature required/)
})

void test('macOS non-release policy accepts ad-hoc signing only when selected', () => {
  assert.throws(() => resolveMacosSigningMode({
    signatureOutput: 'CodeDirectory flags=0x10000(runtime)\nSignature=adhoc\nTeamIdentifier=not set',
    requireDeveloperId: false,
    allowAdhoc: false,
    expectedTeamId: '',
  }), /not explicitly selected/)

  assert.deepEqual(resolveMacosSigningMode({
    signatureOutput: 'CodeDirectory flags=0x10000(runtime)\nSignature=adhoc\nTeamIdentifier=not set',
    requireDeveloperId: false,
    allowAdhoc: true,
    expectedTeamId: '',
  }), { mode: 'adhoc', teamId: null })
})

void test('macOS signing policy rejects signatures without hardened runtime', () => {
  assert.throws(() => resolveMacosSigningMode({
    signatureOutput: 'Authority=Developer ID Application: Pilot Harness (TEAM123456)\nTeamIdentifier=TEAM123456',
    requireDeveloperId: true,
    allowAdhoc: false,
    expectedTeamId: 'TEAM123456',
  }), /missing the hardened runtime/)
})

void test('macOS signing hooks use the shared policy and bounded strict verification', async () => {
  const [afterSign, verifier] = await Promise.all([
    readFile(resolve(appRoot, 'scripts/after-sign.cjs'), 'utf8'),
    readFile(resolve(appRoot, 'scripts/verify-macos-signature.mjs'), 'utf8'),
  ])
  for (const source of [afterSign, verifier]) {
    assert.match(source, /resolveMacosSigningMode\(\{/)
    assert.match(source, /'--verify', '--deep', '--strict', '--verbose=4'/)
    assert.match(source, /killSignal: 'SIGKILL'/)
    assert.match(source, /error\?\.code === 'ETIMEDOUT'/)
    assert.match(source, /'--entitlements', ':-', helper/)
    assert.match(source, /assertHelperEntitlements\(entitlements, helper\)/)
  }
})
