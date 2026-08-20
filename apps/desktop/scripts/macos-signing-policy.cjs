'use strict'

/** Parse the signer identity that codesign reports for one macOS app bundle. */
function parseMacosSignature(output) {
  const text = typeof output === 'string' ? output : ''
  const teamMatch = text.match(/^TeamIdentifier=(.+)$/m)
  return {
    developerId: /^Authority=Developer ID Application:/m.test(text),
    teamId: teamMatch?.[1]?.trim() || null,
    hardenedRuntime: /^CodeDirectory .*\bflags=.*\bruntime\b/im.test(text),
  }
}

/** Reject a nested Electron Helper whose inherited JIT permissions are absent. */
function assertHelperEntitlements(output, helperPath) {
  const text = typeof output === 'string' ? output : ''
  for (const entitlement of [
    'com.apple.security.cs.allow-jit',
    'com.apple.security.cs.allow-unsigned-executable-memory',
    'com.apple.security.inherit',
  ]) {
    if (!text.includes(`<key>${entitlement}</key>`)) {
      throw new Error(`macOS Helper entitlement ${entitlement} is missing: ${helperPath}`)
    }
  }
}

/**
 * Select the accepted macOS signature mode or reject an unsafe release artifact.
 * @param {{ signatureOutput: string, requireDeveloperId: boolean, allowAdhoc: boolean, expectedTeamId: string }} input
 * @returns {{ mode: 'developer_id' | 'adhoc', teamId: string | null }}
 */
function resolveMacosSigningMode({
  signatureOutput,
  requireDeveloperId,
  allowAdhoc,
  expectedTeamId,
}) {
  const signature = parseMacosSignature(signatureOutput)
  if (!signature.hardenedRuntime) {
    throw new Error('macOS package is missing the hardened runtime signature flag')
  }
  const hasDeveloperId = signature.developerId
    && !!signature.teamId
    && signature.teamId !== 'not set'

  if (hasDeveloperId) {
    if (requireDeveloperId && !expectedTeamId) {
      throw new Error('PILOT_HARNESS_APPLE_TEAM_ID is required for distributable macOS packages')
    }
    if (expectedTeamId && signature.teamId !== expectedTeamId) {
      throw new Error(`Developer ID TeamIdentifier mismatch: expected ${expectedTeamId}, got ${signature.teamId}`)
    }
    return { mode: 'developer_id', teamId: signature.teamId }
  }

  if (requireDeveloperId) {
    throw new Error('Developer ID Application signature required; refusing ad-hoc or unsigned package')
  }
  if (!allowAdhoc) {
    throw new Error('No Developer ID signature found and ad-hoc packaging was not explicitly selected')
  }
  return { mode: 'adhoc', teamId: null }
}

module.exports = {
  assertHelperEntitlements,
  parseMacosSignature,
  resolveMacosSigningMode,
}
