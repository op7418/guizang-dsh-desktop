/**
 * Append one workspace-relative file reference to the current composer draft.
 * @param draft - existing unsent composer text.
 * @param path - Workspace-relative file or directory path.
 * @returns the draft with a spaced `@path` token and trailing space.
 */
export function appendWorktreePath(draft: string, path: string): string {
  const separator = draft === '' || /\s$/.test(draft) ? '' : ' '
  return `${draft}${separator}@${path} `
}
