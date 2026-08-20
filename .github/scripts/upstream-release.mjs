#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const TAG_PATTERN = /^dsh-v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

/** Parse the official dsh release tag subset used by the sync workflow. */
export function parseDshTag(tag) {
  const match = TAG_PATTERN.exec(tag)
  if (match === null) throw new Error(`unexpected upstream release tag: ${tag}`)
  return {
    tag,
    version: tag.slice('dsh-v'.length),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  }
}

function compareIdentifier(left, right) {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : undefined
  const rightNumber = /^\d+$/.test(right) ? Number(right) : undefined
  if (leftNumber !== undefined && rightNumber !== undefined) return Math.sign(leftNumber - rightNumber)
  if (leftNumber !== undefined) return -1
  if (rightNumber !== undefined) return 1
  return left === right ? 0 : left < right ? -1 : 1
}

/** Compare two parsed tags using SemVer precedence. */
export function compareDshTags(left, right) {
  for (const field of ['major', 'minor', 'patch']) {
    const difference = left[field] - right[field]
    if (difference !== 0) return Math.sign(difference)
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    if (left.prerelease.length === right.prerelease.length) return 0
    return left.prerelease.length === 0 ? 1 : -1
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index++) {
    const leftPart = left.prerelease[index]
    const rightPart = right.prerelease[index]
    if (leftPart === undefined) return -1
    if (rightPart === undefined) return 1
    const result = compareIdentifier(leftPart, rightPart)
    if (result !== 0) return result
  }
  return 0
}

/** Select one monotonic official release and its Pilot release metadata. */
export function resolveUpstreamRelease(release, tracked) {
  if (release === null || typeof release !== 'object') throw new Error('upstream latest release payload must be an object')
  if (release.draft === true || release.prerelease === true) {
    throw new Error('upstream latest release must not be a draft or GitHub prerelease')
  }
  const candidate = parseDshTag(String(release.tag_name ?? ''))
  const current = parseDshTag(String(tracked.tag ?? ''))
  const comparison = compareDshTags(candidate, current)
  if (comparison < 0) {
    throw new Error(`refusing upstream downgrade from ${current.tag} to ${candidate.tag}`)
  }
  const syncNeeded = comparison > 0
  const pilotVersion = syncNeeded
    ? `${candidate.version}-pilot.1`
    : String(tracked.pilotVersion ?? '')
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?-pilot\.[1-9]\d*$/.test(pilotVersion)) {
    throw new Error(`invalid Pilot version: ${pilotVersion}`)
  }
  return {
    tag: candidate.tag,
    version: candidate.version,
    pilotVersion,
    releaseTag: `v${pilotVersion}`,
    syncNeeded,
    prerelease: candidate.prerelease.length > 0,
  }
}

if (import.meta.main) {
  const [releasePath, trackedPath] = process.argv.slice(2)
  if (!releasePath || !trackedPath) {
    throw new Error('Usage: upstream-release.mjs <github-release.json> <tracked-upstream.json>')
  }
  const result = resolveUpstreamRelease(
    JSON.parse(readFileSync(releasePath, 'utf8')),
    JSON.parse(readFileSync(trackedPath, 'utf8')),
  )
  for (const [key, value] of Object.entries(result)) {
    const outputKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    process.stdout.write(`${outputKey}=${String(value)}\n`)
  }
}
