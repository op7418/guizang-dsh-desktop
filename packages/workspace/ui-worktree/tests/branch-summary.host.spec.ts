import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, ConnectionRpcHandlerOptions } from '@deepseek-ai/dsh-client-connection'
import { apply, inject } from '../src/index.ts'
import { WORKTREE_LIST_ENDPOINT, WORKTREE_MUTATE_ENDPOINT } from '../src/types.ts'

const roots: string[] = []
const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function bench(root: string) {
  const ctx = new Context()
  contexts.push(ctx)
  let handler: ConnectionRpcHandler | undefined
  let options: ConnectionRpcHandlerOptions | undefined
  ctx.provide('connection', {
    rpc: {
      handle: (_channel: string, next: ConnectionRpcHandler, nextOptions: ConnectionRpcHandlerOptions) => {
        handler = next
        options = nextOptions
        return async () => { handler = undefined }
      },
    },
  } as never)
  ctx.provide('workspaceRegistry', {
    get: (id: string) => id === 'w1' ? { workspaceId: id, title: 'Workspace', path: root } : undefined,
  } as never)
  await ctx.plugin({ inject, apply }).await()
  return {
    call: (endpoint: string, payload: unknown) => handler!(endpoint, payload, new AbortController().signal),
    options: () => options,
  }
}

describe('Worktree Host RPC', () => {
  it('uses the shared loopback trust fence and reads branch summary without scanning files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-worktree-'))
    roots.push(root)
    await mkdir(join(root, '.git'))
    await writeFile(join(root, '.git', 'HEAD'), 'ref: refs/heads/feature/sidebar\n')
    await writeFile(join(root, 'large-source-file.ts'), 'export {}')
    const host = await bench(root)

    const result = await host.call(WORKTREE_LIST_ENDPOINT, { workspaceId: 'w1', relative: '', summary: 'branch' })
    expect(host.options()).toEqual({ authority: 'loopback' })
    expect(result).toMatchObject({ ok: true, value: { branch: 'feature/sidebar', entries: [] } })
    if (result.ok) expect((result.value as Record<string, unknown>).fileCount).toBeUndefined()
  })

  it('refuses overwrite-on-rename and portable Windows-invalid names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-worktree-'))
    roots.push(root)
    await writeFile(join(root, 'source.txt'), 'source')
    await writeFile(join(root, 'target.txt'), 'target')
    const host = await bench(root)

    const conflict = await host.call(WORKTREE_MUTATE_ENDPOINT, {
      operation: 'rename', workspaceId: 'w1', path: 'source.txt', name: 'target.txt',
    })
    expect(conflict).toMatchObject({ ok: false, error: { code: 'bad-request' } })
    expect(JSON.stringify(conflict)).toContain('already exists')
    expect(await readFile(join(root, 'source.txt'), 'utf8')).toBe('source')
    expect(await readFile(join(root, 'target.txt'), 'utf8')).toBe('target')

    for (const name of ['CON', 'aux.md', 'bad:name', 'trailing.', ' space']) {
      const invalid = await host.call(WORKTREE_MUTATE_ENDPOINT, {
        operation: 'create-file', workspaceId: 'w1', parent: '', name,
      })
      expect(invalid).toMatchObject({ ok: false, error: { code: 'bad-request' } })
    }
  })

  it('does not expose absolute filesystem paths in unexpected errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-worktree-'))
    roots.push(root)
    const host = await bench(root)
    const warn = vi.spyOn((contexts.at(-1)!).logger, 'warn').mockImplementation(() => {})
    const result = await host.call(WORKTREE_MUTATE_ENDPOINT, {
      operation: 'rename', workspaceId: 'w1', path: 'missing.txt', name: 'next.txt',
    })
    expect(result).toEqual({ ok: false, error: { code: 'internal', message: 'workspace operation failed', details: {} } })
    expect(JSON.stringify(result)).not.toContain(root)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('rejects parent traversal and symbolic-link escapes from the Workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-worktree-'))
    const outside = await mkdtemp(join(tmpdir(), 'dsh-worktree-outside-'))
    roots.push(root, outside)
    await writeFile(join(outside, 'secret.txt'), 'outside')
    await symlink(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
    const host = await bench(root)

    for (const payload of [
      { workspaceId: 'w1', relative: '../outside' },
      { workspaceId: 'w1', relative: 'escape' },
    ]) {
      const result = await host.call(WORKTREE_LIST_ENDPOINT, payload)
      expect(result).toMatchObject({ ok: false, error: { code: 'bad-request' } })
      expect(JSON.stringify(result)).not.toContain(outside)
    }

    const createTraversal = await host.call(WORKTREE_MUTATE_ENDPOINT, {
      operation: 'create-file', workspaceId: 'w1', parent: '..', name: 'escaped.txt',
    })
    expect(createTraversal).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const renameLink = await host.call(WORKTREE_MUTATE_ENDPOINT, {
      operation: 'rename', workspaceId: 'w1', path: 'escape', name: 'renamed',
    })
    expect(renameLink).toMatchObject({ ok: false, error: { code: 'bad-request' } })
    expect(JSON.stringify(renameLink)).toContain('symbolic links')
  })

  it('caps a directory listing and reports truncation without undercounting the Workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-worktree-'))
    roots.push(root)
    for (let offset = 0; offset < 5_001; offset += 200) {
      await Promise.all(Array.from({ length: Math.min(200, 5_001 - offset) }, (_, index) => (
        writeFile(join(root, `entry-${String(offset + index).padStart(4, '0')}.txt`), '')
      )))
    }
    const host = await bench(root)

    const result = await host.call(WORKTREE_LIST_ENDPOINT, { workspaceId: 'w1', relative: '' })
    expect(result).toMatchObject({
      ok: true,
      value: {
        entriesTruncated: true,
        fileCount: 5_001,
        truncated: false,
      },
    })
    if (result.ok) expect((result.value as { entries: unknown[] }).entries).toHaveLength(5_000)
  })
})
