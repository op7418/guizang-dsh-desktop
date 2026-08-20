import assert from 'node:assert/strict'
import test from 'node:test'
import { releaseRenamePlan } from './prepare-release-assets.mjs'

const version = '0.1.0-rc.8-pilot.1'
const names = [
  `Pilot Harness-${version}-arm64.dmg`,
  `Pilot Harness-${version}-arm64.zip`,
  `Pilot Harness.Setup.${version}.exe`,
  `Pilot Harness-${version}-x86_64.AppImage`,
  `Pilot Harness-${version}-amd64.deb`,
  `Pilot Harness-${version}-x86_64.rpm`,
  'deepseek-ai-dsh-ui-worktree-0.1.0.tgz',
]

test('maps one complete native artifact set to stable download names', () => {
  const plan = releaseRenamePlan(names, `v${version}`)
  assert.equal(plan.length, 6)
  assert.deepEqual(plan.map(entry => entry.target), [
    'Pilot-Harness-macOS-arm64.dmg',
    'Pilot-Harness-macOS-arm64.zip',
    'Pilot-Harness-Windows-x64.exe',
    'Pilot-Harness-Linux-x86_64.AppImage',
    'Pilot-Harness-Linux-amd64.deb',
    'Pilot-Harness-Linux-x86_64.rpm',
  ])
})

test('fails closed for missing, duplicate, or malformed release inputs', () => {
  assert.throws(() => releaseRenamePlan(names.slice(1), `v${version}`), /found 0/)
  assert.throws(() => releaseRenamePlan([...names, names[0]], `v${version}`), /found 2/)
  assert.throws(() => releaseRenamePlan(names, 'release latest'), /invalid release tag/)
})
