'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { resolveMacosSigningMode } = require('./macos-signing-policy.cjs')

const INSPECT_TIMEOUT_MS = 15_000
const VERIFY_TIMEOUT_MS = 60_000

/** Run codesign without allowing a timed-out verifier to survive packaging. */
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

/** Resolve the single app bundle created in an electron-builder output directory. */
function findApp(appOutDir) {
  const apps = fs.readdirSync(appOutDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.endsWith('.app'))
    .map(entry => path.join(appOutDir, entry.name))
  if (apps.length !== 1) throw new Error(`Expected one macOS app bundle in ${appOutDir}, found ${apps.length}`)
  return apps[0]
}

module.exports = async function afterSign(context) {
  if (context.packager.platform.name !== 'mac') return

  const appPath = findApp(context.appOutDir)
  const signatureOutput = runCodesign(['-d', '--verbose=4', appPath], INSPECT_TIMEOUT_MS)
  const decision = resolveMacosSigningMode({
    signatureOutput,
    requireDeveloperId: process.env.PILOT_HARNESS_REQUIRE_DEVELOPER_ID === '1',
    allowAdhoc: context.packager.platformSpecificBuildOptions.identity === '-'
      || process.env.PILOT_HARNESS_ALLOW_ADHOC_SIGNING === '1',
    expectedTeamId: process.env.PILOT_HARNESS_APPLE_TEAM_ID?.trim() || '',
  })

  runCodesign(['--verify', '--deep', '--strict', '--verbose=4', appPath], VERIFY_TIMEOUT_MS)
  console.log(`[afterSign] ${decision.mode} signature verified for ${path.basename(appPath)}`)
}
