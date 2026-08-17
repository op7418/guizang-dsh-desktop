import assert from 'node:assert/strict'
import test from 'node:test'
import { extractHarnessServerUrl, isHarnessServerUrl, LineBuffer } from '../src/server-url.ts'

test('accepts only explicit loopback HTTP server URLs', () => {
  assert.equal(isHarnessServerUrl('http://127.0.0.1:3080'), true)
  assert.equal(isHarnessServerUrl('http://localhost:49152'), true)
  assert.equal(isHarnessServerUrl('https://127.0.0.1:3080'), false)
  assert.equal(isHarnessServerUrl('http://0.0.0.0:3080'), false)
  assert.equal(isHarnessServerUrl('http://example.com:3080'), false)
  assert.equal(isHarnessServerUrl('http://user:pass@127.0.0.1:3080'), false)
})

test('extracts the settled URL from the DSH startup line', () => {
  assert.equal(
    extractHarnessServerUrl('dsh web: http://127.0.0.1:43127'),
    'http://127.0.0.1:43127',
  )
  assert.equal(extractHarnessServerUrl('dsh web: http://example.com:43127'), undefined)
  assert.equal(extractHarnessServerUrl('some unrelated log line'), undefined)
})

test('line buffering preserves chunk boundaries and a final fragment', () => {
  const lines = new LineBuffer()
  assert.deepEqual(lines.push('one\ntw'), ['one'])
  assert.deepEqual(lines.push('o\r\nthree\n'), ['two', 'three'])
  assert.deepEqual(lines.push('last'), [])
  assert.deepEqual(lines.flush(), ['last'])
  assert.deepEqual(lines.flush(), [])
})
