import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveNextPilotRevision } from './pilot-release-revision.mjs'

const tracked = {
  tag: 'dsh-v0.1.0-rc.7',
  commit: 'a'.repeat(40),
  pilotVersion: '0.1.0-rc.7-pilot.1',
}

test('increments after the highest released Pilot revision on the tracked upstream', () => {
  assert.deepEqual(resolveNextPilotRevision(tracked, [
    { tagName: 'v0.1.0-rc.7-pilot.1' },
    { tagName: 'v0.1.0-rc.7-pilot.3' },
    { tagName: 'v0.1.0-pilot.9' },
  ]), {
    pilotVersion: '0.1.0-rc.7-pilot.4',
    releaseTag: 'v0.1.0-rc.7-pilot.4',
    prerelease: true,
  })
})

test('accepts paginated raw GitHub release responses', () => {
  assert.deepEqual(resolveNextPilotRevision(tracked, [[
    { tag_name: 'v0.1.0-rc.7-pilot.1' },
    { tag_name: 'v0.1.0-rc.7-pilot.2' },
  ]]), {
    pilotVersion: '0.1.0-rc.7-pilot.3',
    releaseTag: 'v0.1.0-rc.7-pilot.3',
    prerelease: true,
  })
})

test('refuses to skip a missing current release or mix upstream versions', () => {
  assert.throws(
    () => resolveNextPilotRevision(tracked, [{ tagName: 'v0.1.0-rc.7-pilot.2' }]),
    /current Pilot release .* is missing/,
  )
  assert.throws(
    () => resolveNextPilotRevision({ ...tracked, pilotVersion: '0.1.0-rc.8-pilot.1' }, []),
    /does not match/,
  )
})
