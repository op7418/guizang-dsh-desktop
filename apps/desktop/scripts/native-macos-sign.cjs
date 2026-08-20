'use strict'

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SIGN_TIMEOUT_MS = 15 * 60_000

function normalizedSignatureFlags(signatureFlags, hardenedRuntime) {
  const flags = Array.isArray(signatureFlags)
    ? signatureFlags
    : typeof signatureFlags === 'string'
      ? signatureFlags.split(',').map(flag => flag.trim()).filter(Boolean)
      : []
  if (hardenedRuntime) flags.push('runtime')
  return [...new Set(flags)]
}

/** Build a shell-free codesign invocation from electron-builder's sign options. */
function buildCodesignArgs(options, fileOptions = {}, target = options.app, deep = false) {
  if (!options?.app?.endsWith('.app')) throw new Error('Native macOS signing requires an .app bundle')
  if (!options.identity) throw new Error('Native macOS signing requires an explicit identity')
  if (Array.isArray(fileOptions.entitlements)) {
    throw new Error('Native macOS signing requires an entitlements plist path')
  }

  const args = ['--force']
  if (deep) args.push('--deep')
  args.push('--verbose=4', '--sign', options.identity)
  if (options.keychain) args.push('--keychain', options.keychain)

  if (fileOptions.requirements) {
    if (fileOptions.requirements.startsWith('=')) args.push(`-r${fileOptions.requirements}`)
    else args.push('--requirements', fileOptions.requirements)
  }

  if (options.identity === '-' || fileOptions.timestamp === 'none') args.push('--timestamp=none')
  else if (fileOptions.timestamp) args.push(`--timestamp=${fileOptions.timestamp}`)
  else args.push('--timestamp')

  const signatureFlags = normalizedSignatureFlags(
    fileOptions.signatureFlags,
    fileOptions.hardenedRuntime,
  )
  if (signatureFlags.length) args.push('--options', signatureFlags.join(','))
  if (fileOptions.additionalArguments) args.push(...fileOptions.additionalArguments)
  if (fileOptions.entitlements) args.push('--entitlements', fileOptions.entitlements)
  args.push(target)
  return args
}

function nestedAppBundles(appPath) {
  const apps = []
  const pending = [appPath]
  while (pending.length > 0) {
    const directory = pending.pop()
    if (directory === undefined) continue
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const absolute = path.join(directory, entry.name)
      if (absolute !== appPath && entry.name.endsWith('.app')) apps.push(absolute)
      else pending.push(absolute)
    }
  }
  return apps.sort((left, right) => right.length - left.length)
}

function runCodesign(args) {
  const result = spawnSync('/usr/bin/codesign', args, {
    encoding: 'utf8',
    timeout: SIGN_TIMEOUT_MS,
    killSignal: 'SIGKILL',
  })

  if (result.error?.code === 'ETIMEDOUT') {
    throw new Error(`Native macOS signing timed out after ${SIGN_TIMEOUT_MS}ms`)
  }
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Native macOS signing failed').trim())
  }
}

/**
 * Sign the unpacked desktop bundle without walking every resource in Node.js.
 * Apple's codesign performs the recursive traversal and the afterSign hook
 * independently verifies the resulting nested signatures.
 */
async function sign(options) {
  const appOptions = options.optionsForFile
    ? await Promise.resolve(options.optionsForFile(options.app))
    : {}
  // Bootstrap every nested framework and binary with Apple's own traversal;
  // then re-sign Helper app bundles with electron-builder's inherit plist and
  // seal the outer app again. `--deep` alone does not propagate entitlements.
  runCodesign(buildCodesignArgs(options, appOptions, options.app, true))
  const helpers = nestedAppBundles(options.app)
  for (const helper of helpers) {
    const helperOptions = options.optionsForFile
      ? await Promise.resolve(options.optionsForFile(helper))
      : {}
    runCodesign(buildCodesignArgs(options, helperOptions, helper))
  }
  runCodesign(buildCodesignArgs(options, appOptions))
  console.log(`[native-macos-sign] signed ${options.app} with ${helpers.length} Helper app bundle(s)`)
}

module.exports = sign
module.exports.buildCodesignArgs = buildCodesignArgs
module.exports.nestedAppBundles = nestedAppBundles
