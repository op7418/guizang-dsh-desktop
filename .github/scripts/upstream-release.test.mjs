import assert from 'node:assert/strict'
import test from 'node:test'
import { compareDshTags, parseDshTag, resolveUpstreamRelease } from './upstream-release.mjs'

const tracked = {
  tag: 'dsh-v0.1.0-rc.7',
  commit: 'a'.repeat(40),
  pilotVersion: '0.1.0-rc.7-pilot.1',
}

test('orders official release candidates by SemVer precedence', () => {
  assert.equal(compareDshTags(parseDshTag('dsh-v0.1.0-rc.8'), parseDshTag(tracked.tag)), 1)
  assert.equal(compareDshTags(parseDshTag('dsh-v0.1.0'), parseDshTag(tracked.tag)), 1)
  assert.equal(compareDshTags(parseDshTag('dsh-v0.0.9'), parseDshTag(tracked.tag)), -1)
})

test('resolves one newer official release to the first Pilot revision', () => {
  assert.deepEqual(resolveUpstreamRelease({
    tag_name: 'dsh-v0.1.0-rc.8', draft: false, prerelease: false,
  }, tracked), {
    tag: 'dsh-v0.1.0-rc.8',
    version: '0.1.0-rc.8',
    pilotVersion: '0.1.0-rc.8-pilot.1',
    releaseTag: 'v0.1.0-rc.8-pilot.1',
    syncNeeded: true,
    prerelease: true,
  })
})

test('keeps the tracked Pilot revision when only its release is missing', () => {
  assert.equal(resolveUpstreamRelease({
    tag_name: tracked.tag, draft: false, prerelease: false,
  }, tracked).pilotVersion, tracked.pilotVersion)
})

test('rejects downgrades, mutable release classes, and malformed tags', () => {
  assert.throws(() => resolveUpstreamRelease({
    tag_name: 'dsh-v0.1.0-rc.6', draft: false, prerelease: false,
  }, tracked), /refusing upstream downgrade/)
  assert.throws(() => resolveUpstreamRelease({
    tag_name: 'dsh-v0.1.0-rc.8', draft: false, prerelease: true,
  }, tracked), /must not be a draft or GitHub prerelease/)
  assert.throws(() => parseDshTag('dsh-v0.1.0;echo-bad'), /unexpected upstream release tag/)
})
