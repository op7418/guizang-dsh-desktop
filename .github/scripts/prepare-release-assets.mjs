#!/usr/bin/env node

import { readdirSync, renameSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Resolve the exact native output set before assigning stable download names. */
export function releaseRenamePlan(names, releaseTag) {
  if (!/^v[0-9A-Za-z.-]+$/.test(releaseTag)) throw new Error(`invalid release tag: ${releaseTag}`)
  const version = escapeRegExp(releaseTag.slice(1))
  const targets = [
    [new RegExp(`^Pilot Harness-${version}-arm64\\.dmg$`), 'Pilot-Harness-macOS-arm64.dmg'],
    [new RegExp(`^Pilot Harness-${version}-arm64\\.zip$`), 'Pilot-Harness-macOS-arm64.zip'],
    [new RegExp(`^Pilot Harness\\.Setup\\.${version}\\.exe$`), 'Pilot-Harness-Windows-x64.exe'],
    [new RegExp(`^Pilot Harness-${version}-x86_64\\.AppImage$`), 'Pilot-Harness-Linux-x86_64.AppImage'],
    [new RegExp(`^Pilot Harness-${version}-amd64\\.deb$`), 'Pilot-Harness-Linux-amd64.deb'],
    [new RegExp(`^Pilot Harness-${version}-x86_64\\.rpm$`), 'Pilot-Harness-Linux-x86_64.rpm'],
  ]
  return targets.map(([pattern, target]) => {
    const matches = names.filter(name => pattern.test(name))
    if (matches.length !== 1) {
      throw new Error(`expected exactly one ${pattern} artifact, found ${matches.length}`)
    }
    return { source: matches[0], target }
  })
}

const invokedPath = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href
if (import.meta.url === invokedPath) {
  const [directoryArgument, releaseTag] = process.argv.slice(2)
  if (!directoryArgument || !releaseTag) {
    throw new Error('Usage: prepare-release-assets.mjs <release-assets-directory> <v-release-tag>')
  }
  const directory = resolve(directoryArgument)
  const plan = releaseRenamePlan(readdirSync(directory), releaseTag)
  for (const { source, target } of plan) {
    renameSync(join(directory, source), join(directory, target))
    console.log(`${basename(source)} -> ${target}`)
  }
}
