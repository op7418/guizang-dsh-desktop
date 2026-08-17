import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'

const root = resolve(import.meta.dirname, '..')
const bundles = [
  ['packages/client/ui-codepilot-theme', 'codepilot-theme'],
  ['packages/workspace/ui-worktree', 'pilot-worktree'],
  ['packages/schedule/ui-schedule-summary', 'pilot-schedule-summary'],
  ['packages/session-query/session-log-export', 'session-log-download'],
] as const

describe('Pilot Harness release plugin bundles', () => {
  it.each(bundles)('%s ships a parseable dsh.bundle patch containing %s', (directory, expectedId) => {
    const packageRoot = resolve(root, directory)
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: string } }
      exports?: Record<string, unknown>
      files?: string[]
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.exports?.['./cordis.patch.yml']).toBe('./cordis.patch.yml')
    expect(manifest.files).toContain('cordis.patch.yml')

    const parsed = yaml.load(
      readFileSync(resolve(packageRoot, manifest.dsh!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    )
    expect(Array.isArray(parsed)).toBe(true)
    const ids = (parsed as { id?: string; insert?: { id?: string }[] }[]).flatMap(patch => [
      patch.id,
      ...(patch.insert ?? []).map(row => row.id),
    ]).filter((id): id is string => id !== undefined)
    expect(ids).toContain(expectedId)
  })
})
