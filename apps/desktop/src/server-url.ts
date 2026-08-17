/** Accept only the loopback HTTP server printed by `dsh web`. */
export function isHarnessServerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      && url.username === ''
      && url.password === ''
      && url.port !== ''
  } catch {
    return false
  }
}

/** Extract the settled server URL from the line emitted by the Web bundle. */
export function extractHarnessServerUrl(line: string): string | undefined {
  const match = /(?:^|\s)dsh web:\s+(http:\/\/[^\s]+)/.exec(line)
  if (match?.[1] === undefined || !isHarnessServerUrl(match[1])) return undefined
  return match[1]
}

/** Incrementally split child-process output without losing a trailing fragment. */
export class LineBuffer {
  private pending = ''

  /** Add a chunk and return every complete line it produced. */
  push(chunk: string): string[] {
    const parts = `${this.pending}${chunk}`.split(/\r?\n/)
    this.pending = parts.pop() ?? ''
    return parts
  }

  /** Return the final unterminated line, when one exists. */
  flush(): string[] {
    if (this.pending === '') return []
    const line = this.pending
    this.pending = ''
    return [line]
  }
}
