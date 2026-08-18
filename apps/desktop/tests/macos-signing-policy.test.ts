import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const appRoot = resolve(import.meta.dirname, '..')
const { resolveMacosSigningMode } = require('../scripts/macos-signing-policy.cjs') as {
  resolveMacosSigningMode(input: {
    signatureOutput: string
    requireDeveloperId: boolean
    allowAdhoc: boolean
    expectedTeamId: string
  }): { mode: 'developer_id' | 'adhoc'; teamId: string | null }
}

const developerIdSignature = [
  'Authority=Developer ID Application: Pilot Harness (TEAM123456)',
  'TeamIdentifier=TEAM123456',
].join('\n')

test('macOS release signatures require the configured Developer ID Team', () => {
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

test('macOS release policy rejects unsigned and ad-hoc artifacts', () => {
  assert.throws(() => resolveMacosSigningMode({
    signatureOutput: 'Signature=adhoc\nTeamIdentifier=not set',
    requireDeveloperId: true,
    allowAdhoc: true,
    expectedTeamId: 'TEAM123456',
  }), /Developer ID Application signature required/)
})

test('macOS non-release policy accepts ad-hoc signing only when selected', () => {
  assert.throws(() => resolveMacosSigningMode({
    signatureOutput: 'Signature=adhoc\nTeamIdentifier=not set',
    requireDeveloperId: false,
    allowAdhoc: false,
    expectedTeamId: '',
  }), /not explicitly selected/)

  assert.deepEqual(resolveMacosSigningMode({
    signatureOutput: 'Signature=adhoc\nTeamIdentifier=not set',
    requireDeveloperId: false,
    allowAdhoc: true,
    expectedTeamId: '',
  }), { mode: 'adhoc', teamId: null })
})

test('macOS signing hooks use the shared policy and bounded strict verification', async () => {
  const [afterSign, verifier] = await Promise.all([
    readFile(resolve(appRoot, 'scripts/after-sign.cjs'), 'utf8'),
    readFile(resolve(appRoot, 'scripts/verify-macos-signature.mjs'), 'utf8'),
  ])
  for (const source of [afterSign, verifier]) {
    assert.match(source, /resolveMacosSigningMode\(\{/)
    assert.match(source, /'--verify', '--deep', '--strict', '--verbose=4'/)
    assert.match(source, /killSignal: 'SIGKILL'/)
    assert.match(source, /error\?\.code === 'ETIMEDOUT'/)
  }
})
