/** Host half of the Worktree plugin: loopback-only, Workspace-confined RPC. */

import { lstat, mkdir, open, opendir, readFile, realpath, rename, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-workspace'
import {
  WORKTREE_CHANNEL,
  WORKTREE_LIST_ENDPOINT,
  WORKTREE_MUTATE_ENDPOINT,
  type WorktreeEntry,
  type WorktreeListing,
  type WorktreeListRequest,
  type WorktreeMutation,
  type WorktreeMutationResult,
} from './types.ts'

const MAX_COUNTED_FILES = 20_000
const MAX_DIRECTORY_ENTRIES = 5_000
const IGNORED_NAMES = new Set(['.git', '.DS_Store', 'node_modules'])
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu

class PublicWorktreeError extends Error {}

function badRequest(message: string) {
  return { ok: false as const, error: { code: 'bad-request' as const, message, details: { issues: [] } } }
}

function internalError(message: string) {
  return { ok: false as const, error: { code: 'internal' as const, message, details: {} } }
}

function safeRelative(value: string): string {
  if (value.includes('\0') || isAbsolute(value)) throw new PublicWorktreeError('invalid relative path')
  const segments = value.split(/[\\/]+/).filter(Boolean)
  if (segments.some(segment => segment === '.' || segment === '..')) {
    throw new PublicWorktreeError('invalid relative path')
  }
  return segments.join('/')
}

function safeName(value: string): string {
  if (value !== value.trim() || value === '' || value === '.' || value === '..'
    || /[\\/\0<>:"|?*]/u.test(value) || value.endsWith('.') || WINDOWS_RESERVED_NAME.test(value)) {
    throw new PublicWorktreeError('name is not portable across supported desktop platforms')
  }
  return value
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

async function confinedDirectory(root: string, relativePath: string): Promise<string> {
  const candidate = resolve(root, safeRelative(relativePath))
  const canonical = await realpath(candidate)
  if (!isInside(root, canonical)) throw new PublicWorktreeError('path leaves the workspace')
  return canonical
}

async function directoryEntries(
  root: string,
  directory: string,
): Promise<{ entries: WorktreeEntry[]; truncated: boolean }> {
  const entries: WorktreeEntry[] = []
  let truncated = false
  const handle = await opendir(directory)
  for await (const row of handle) {
    if (IGNORED_NAMES.has(row.name) || row.isSymbolicLink() || (!row.isDirectory() && !row.isFile())) continue
    if (entries.length >= MAX_DIRECTORY_ENTRIES) {
      truncated = true
      break
    }
    entries.push({
      name: row.name,
      path: relative(root, join(directory, row.name)).split(sep).join('/'),
      kind: row.isDirectory() ? 'directory' : 'file',
    })
  }
  entries.sort((left, right) => left.kind === right.kind
    ? left.name.localeCompare(right.name)
    : left.kind === 'directory' ? -1 : 1)
  return { entries, truncated }
}

async function countFiles(root: string): Promise<{ count: number; truncated: boolean }> {
  let count = 0
  const pending = [root]
  while (pending.length > 0 && count < MAX_COUNTED_FILES) {
    const current = pending.pop()
    if (current === undefined) break
    const handle = await opendir(current)
    for await (const row of handle) {
      if (IGNORED_NAMES.has(row.name) || row.isSymbolicLink()) continue
      if (row.isDirectory()) pending.push(join(current, row.name))
      else if (row.isFile()) count += 1
      if (count >= MAX_COUNTED_FILES) break
    }
  }
  return { count, truncated: count >= MAX_COUNTED_FILES }
}

/** Resolve `.git/HEAD` without spawning Git; supports ordinary and linked worktrees. */
async function currentBranch(root: string): Promise<string | undefined> {
  const marker = join(root, '.git')
  let gitDir = marker
  try {
    const markerStat = await stat(marker)
    if (markerStat.isFile()) {
      const pointer = (await readFile(marker, 'utf8')).trim()
      if (!pointer.startsWith('gitdir:')) return undefined
      const target = pointer.slice('gitdir:'.length).trim()
      gitDir = isAbsolute(target) ? target : resolve(dirname(marker), target)
    } else if (!markerStat.isDirectory()) return undefined
    const head = (await readFile(join(gitDir, 'HEAD'), 'utf8')).trim()
    const prefix = 'ref: refs/heads/'
    if (head.startsWith(prefix)) return head.slice(prefix.length)
    return /^[0-9a-f]{7,64}$/iu.test(head) ? head.slice(0, 7) : undefined
  } catch {
    return undefined
  }
}

function listRequest(value: unknown): WorktreeListRequest {
  if (value === null || typeof value !== 'object') throw new PublicWorktreeError('invalid list request')
  const row = value as Record<string, unknown>
  if (typeof row.workspaceId !== 'string'
    || (row.relative !== undefined && typeof row.relative !== 'string')
    || (row.summary !== undefined && row.summary !== 'branch')) {
    throw new PublicWorktreeError('invalid list request')
  }
  return {
    workspaceId: row.workspaceId,
    ...(typeof row.relative === 'string' ? { relative: row.relative } : {}),
    ...(row.summary === 'branch' ? { summary: row.summary } : {}),
  }
}

function mutation(value: unknown): WorktreeMutation {
  if (value === null || typeof value !== 'object') throw new PublicWorktreeError('invalid mutation')
  const row = value as Record<string, unknown>
  if (typeof row.workspaceId !== 'string' || typeof row.name !== 'string') {
    throw new PublicWorktreeError('invalid mutation')
  }
  if (row.operation === 'create-file' || row.operation === 'create-directory') {
    if (typeof row.parent !== 'string') throw new PublicWorktreeError('invalid mutation')
    return { operation: row.operation, workspaceId: row.workspaceId, parent: row.parent, name: row.name }
  }
  if (row.operation === 'rename' && typeof row.path === 'string') {
    return { operation: row.operation, workspaceId: row.workspaceId, path: row.path, name: row.name }
  }
  throw new PublicWorktreeError('invalid mutation')
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

function isNameConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error.code === 'EEXIST' || error.code === 'ENOTEMPTY')
}

async function listWorkspace(ctx: Context, request: WorktreeListRequest): Promise<WorktreeListing> {
  const workspace = ctx.workspaceRegistry.get(WorkspaceId(request.workspaceId))
  if (workspace === undefined) throw new PublicWorktreeError('workspace not found')
  const root = await realpath(workspace.path)
  const relativePath = safeRelative(request.relative ?? '')
  const directory = await confinedDirectory(root, relativePath)
  const summaryOnly = request.summary === 'branch'
  const listing = summaryOnly ? { entries: [], truncated: false } : await directoryEntries(root, directory)
  const count = !summaryOnly && relativePath === '' ? await countFiles(root) : undefined
  const branch = summaryOnly && relativePath === '' ? await currentBranch(root) : undefined
  return {
    workspaceId: request.workspaceId,
    workspaceTitle: workspace.title,
    relative: relativePath,
    entries: listing.entries,
    ...(listing.truncated ? { entriesTruncated: true } : {}),
    ...(count === undefined ? {} : { fileCount: count.count, truncated: count.truncated }),
    ...(branch === undefined ? {} : { branch }),
  }
}

async function mutateWorkspace(ctx: Context, action: WorktreeMutation): Promise<WorktreeMutationResult> {
  const workspace = ctx.workspaceRegistry.get(WorkspaceId(action.workspaceId))
  if (workspace === undefined) throw new PublicWorktreeError('workspace not found')
  const root = await realpath(workspace.path)
  const name = safeName(action.name)
  if (action.operation === 'rename') {
    const sourceRelative = safeRelative(action.path)
    if (sourceRelative === '') throw new PublicWorktreeError('workspace root cannot be renamed')
    const slash = sourceRelative.lastIndexOf('/')
    const parentRelative = slash < 0 ? '' : sourceRelative.slice(0, slash)
    const sourceName = slash < 0 ? sourceRelative : sourceRelative.slice(slash + 1)
    const parent = await confinedDirectory(root, parentRelative)
    const source = join(parent, sourceName)
    const sourceStat = await lstat(source)
    if (sourceStat.isSymbolicLink()) throw new PublicWorktreeError('symbolic links cannot be renamed')
    const destination = join(parent, name)
    if (source === destination) return { ok: true, path: sourceRelative }
    try {
      await lstat(destination)
      const [sourceCanonical, destinationCanonical] = await Promise.all([realpath(source), realpath(destination)])
      if (sourceCanonical !== destinationCanonical) throw new PublicWorktreeError('an item with that name already exists')
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    try {
      await rename(source, destination)
    } catch (error) {
      if (isNameConflict(error)) throw new PublicWorktreeError('an item with that name already exists')
      throw error
    }
    return { ok: true, path: relative(root, destination).split(sep).join('/') }
  }

  const parent = await confinedDirectory(root, safeRelative(action.parent))
  const destination = join(parent, name)
  try {
    if (action.operation === 'create-directory') await mkdir(destination)
    else {
      const handle = await open(destination, 'wx')
      await handle.close()
    }
  } catch (error) {
    if (isNameConflict(error)) throw new PublicWorktreeError('an item with that name already exists')
    throw error
  }
  return { ok: true, path: relative(root, destination).split(sep).join('/') }
}

/** Required Host services. */
export const inject = ['connection', 'workspaceRegistry']

/** Register loopback-only Worktree RPC. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.connection.rpc.handle(WORKTREE_CHANNEL, async (endpoint, payload, signal) => {
    if (signal.aborted) return { ok: false, error: { code: 'cancelled', message: 'request cancelled', details: {} } }
    try {
      if (endpoint === WORKTREE_LIST_ENDPOINT) {
        return { ok: true, value: await listWorkspace(ctx, listRequest(payload)) }
      }
      if (endpoint === WORKTREE_MUTATE_ENDPOINT) {
        return { ok: true, value: await mutateWorkspace(ctx, mutation(payload)) }
      }
      return badRequest('unknown worktree operation')
    } catch (error) {
      if (error instanceof PublicWorktreeError) return badRequest(error.message)
      ctx.logger.warn(`ui-worktree: Workspace operation failed: ${String(error)}`)
      return internalError('workspace operation failed')
    }
  }, { authority: 'loopback' }), 'ui-worktree: loopback Workspace RPC')
}
