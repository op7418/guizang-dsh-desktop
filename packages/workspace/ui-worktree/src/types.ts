/** Browser/Host wire shapes owned by the Worktree plugin. */

/** Dedicated Connection RPC channel protected by the loopback trust policy. */
export const WORKTREE_CHANNEL = '/pilot-worktree'
/** Read-only RPC operation for confined directory and branch summaries. */
export const WORKTREE_LIST_ENDPOINT = 'list'
/** Mutation RPC operation for confined create and rename requests. */
export const WORKTREE_MUTATE_ENDPOINT = 'mutate'

/** Request for one Workspace-confined directory or branch summary. */
export interface WorktreeListRequest {
  readonly workspaceId: string
  readonly relative?: string
  readonly summary?: 'branch'
}

/** One non-symbolic file or directory visible in a Worktree listing. */
export interface WorktreeEntry {
  readonly name: string
  readonly path: string
  readonly kind: 'file' | 'directory'
}

/** One Workspace-confined directory listing returned to the browser plugin. */
export interface WorktreeListing {
  readonly workspaceId: string
  readonly workspaceTitle: string
  readonly relative: string
  readonly entries: readonly WorktreeEntry[]
  /** Root-only recursive count, excluding dependency and VCS internals. */
  readonly fileCount?: number
  readonly truncated?: boolean
  /** The directory contains more rows than this response intentionally returns. */
  readonly entriesTruncated?: boolean
  /** Current Git branch (or detached commit prefix) when the Workspace root is a repository. */
  readonly branch?: string
}

/** Supported Workspace-confined filesystem mutations. */
export type WorktreeMutation =
  | { readonly operation: 'create-file'; readonly workspaceId: string; readonly parent: string; readonly name: string }
  | { readonly operation: 'create-directory'; readonly workspaceId: string; readonly parent: string; readonly name: string }
  | { readonly operation: 'rename'; readonly workspaceId: string; readonly path: string; readonly name: string }

/** Successful result of a Worktree mutation. */
export interface WorktreeMutationResult {
  readonly ok: true
  readonly path: string
}
