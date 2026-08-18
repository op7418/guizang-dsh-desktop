#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { relative, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { resolveMacosSigningMode } = require('./macos-signing-policy.cjs')
const INSPECT_TIMEOUT_MS = 15_000
const VERIFY_TIMEOUT_MS = 60_000

/** Find app bundles without descending into an app's own nested helpers. */
function findApps(root, maxDepth = 4) {
  const apps = []
  const pending = [{ directory: root, depth: 0 }]
  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || current.depth > maxDepth) continue
    for (const entry of readdirSync(current.directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const absolute = resolve(current.directory, entry.name)
      if (entry.name.endsWith('.app')) apps.push(absolute)
      else pending.push({ directory: absolute, depth: current.depth + 1 })
    }
  }
  return apps.sort()
}

/** Run one bounded codesign operation. */
function runCodesign(args, timeout) {
  const result = spawnSync('/usr/bin/codesign', args, {
    encoding: 'utf8',
    timeout,
    killSignal: 'SIGKILL',
  })
  if (result.error?.code === 'ETIMEDOUT') throw new Error(`codesign timed out after ${timeout}ms`)
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'codesign failed').trim())
  return `${result.stdout || ''}\n${result.stderr || ''}`
}

const releaseRoot = process.argv[2] ? resolve(process.argv[2]) : ''
const expectedCount = Number.parseInt(process.argv[3] || '', 10)
if (!releaseRoot || !Number.isSafeInteger(expectedCount) || expectedCount < 1) {
  throw new Error('Usage: verify-macos-signature.mjs <release-root> <expected-app-count>')
}

const apps = findApps(releaseRoot)
if (apps.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} macOS app bundle(s), found ${apps.length}`)
}

for (const appPath of apps) {
  const signatureOutput = runCodesign(['-d', '--verbose=4', appPath], INSPECT_TIMEOUT_MS)
  const decision = resolveMacosSigningMode({
    signatureOutput,
    requireDeveloperId: process.env.PILOT_HARNESS_REQUIRE_DEVELOPER_ID === '1',
    allowAdhoc: process.env.PILOT_HARNESS_ALLOW_ADHOC_SIGNING === '1',
    expectedTeamId: process.env.PILOT_HARNESS_APPLE_TEAM_ID?.trim() || '',
  })
  runCodesign(['--verify', '--deep', '--strict', '--verbose=4', appPath], VERIFY_TIMEOUT_MS)
  console.log(`${decision.mode} signature OK: ${relative(releaseRoot, appPath)}${decision.teamId ? ` team=${decision.teamId}` : ''}`)
}
