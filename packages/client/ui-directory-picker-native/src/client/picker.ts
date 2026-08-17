/** Desktop-aware selection of the active native directory chooser. */

declare global {
  interface Window {
    /** Desktop preload bridge. Absent in the regular browser surface. */
    pilotHarness?: {
      pickDirectory?: () => Promise<string | null>
    }
  }
}

/**
 * Prefer the desktop shell's native chooser while preserving the Web Host seam.
 * @param hostPick - regular Web chooser call.
 * @returns the selected path, or null when the chooser is cancelled.
 */
export function pickDirectory(hostPick: () => Promise<string | null>): Promise<string | null> {
  const desktopPick = window.pilotHarness?.pickDirectory
  return desktopPick === undefined ? hostPick() : desktopPick()
}
