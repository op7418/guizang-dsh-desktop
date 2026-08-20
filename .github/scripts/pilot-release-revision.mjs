#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseDshTag } from './upstream-release.mjs'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Select the next Pilot-only revision after the currently released revision. */
export function resolveNextPilotRevision(tracked, releases) {
  const upstream = parseDshTag(String(tracked?.tag ?? ''))
  const current = String(tracked?.pilotVersion ?? '')
  const pattern = new RegExp(`^v${escapeRegExp(upstream.version)}-pilot\\.([1-9]\\d*)$`)
  const currentMatch = pattern.exec(`v${current}`)
  if (currentMatch === null) throw new Error(`tracked Pilot version does not match ${upstream.tag}: ${current}`)

  const tags = Array.isArray(releases)
    ? releases.map(entry => typeof entry === 'string' ? entry : String(entry?.tagName ?? ''))
    : []
  if (!tags.includes(`v${current}`)) {
    throw new Error(`current Pilot release v${current} is missing; retry that release before incrementing`)
  }
  const revisions = tags.flatMap((tag) => {
    const match = pattern.exec(tag)
    return match === null ? [] : [Number(match[1])]
  })
  const next = Math.max(Number(currentMatch[1]), ...revisions) + 1
  const pilotVersion = `${upstream.version}-pilot.${next}`
  return {
    pilotVersion,
    releaseTag: `v${pilotVersion}`,
    prerelease: upstream.prerelease.length > 0,
  }
}

const invokedPath = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href
if (import.meta.url === invokedPath) {
  const [trackedPath, releasesPath] = process.argv.slice(2)
  if (!trackedPath || !releasesPath) {
    throw new Error('Usage: pilot-release-revision.mjs <tracked-upstream.json> <github-releases.json>')
  }
  const result = resolveNextPilotRevision(
    JSON.parse(readFileSync(trackedPath, 'utf8')),
    JSON.parse(readFileSync(releasesPath, 'utf8')),
  )
  for (const [key, value] of Object.entries(result)) {
    const outputKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    process.stdout.write(`${outputKey}=${String(value)}\n`)
  }
}
