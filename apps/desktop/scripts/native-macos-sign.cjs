'use strict'

const { spawnSync } = require('node:child_process')

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
function buildCodesignArgs(options, fileOptions = {}) {
  if (!options?.app?.endsWith('.app')) throw new Error('Native macOS signing requires an .app bundle')
  if (!options.identity) throw new Error('Native macOS signing requires an explicit identity')
  if (Array.isArray(fileOptions.entitlements)) {
    throw new Error('Native macOS signing requires an entitlements plist path')
  }

  const args = ['--force', '--deep', '--verbose=4', '--sign', options.identity]
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
  args.push(options.app)
  return args
}

/**
 * Sign the unpacked desktop bundle without walking every resource in Node.js.
 * Apple's codesign performs the recursive traversal and the afterSign hook
 * independently verifies the resulting nested signatures.
 */
async function sign(options) {
  const fileOptions = options.optionsForFile
    ? await Promise.resolve(options.optionsForFile(options.app))
    : {}
  const args = buildCodesignArgs(options, fileOptions)
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
  console.log(`[native-macos-sign] signed ${options.app}`)
}

module.exports = sign
module.exports.buildCodesignArgs = buildCodesignArgs
