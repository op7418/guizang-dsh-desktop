/** Electron nativeTheme values accepted across the preload IPC boundary. */
export type NativeThemeSource = 'system' | 'light' | 'dark'

/**
 * Validate a renderer-supplied Electron nativeTheme source.
 * @param value - untrusted IPC payload.
 * @returns whether the payload is an accepted native theme source.
 */
export function isNativeThemeSource(value: unknown): value is NativeThemeSource {
  return value === 'system' || value === 'light' || value === 'dark'
}

/** Decode the persisted native theme source, falling back after corruption. */
export function decodeNativeThemeSource(value: string | undefined): NativeThemeSource {
  const candidate = value?.trim()
  return isNativeThemeSource(candidate) ? candidate : 'system'
}

/**
 * Select the opaque BrowserWindow backing color for the active native palette.
 * @param dark - whether Electron currently resolves to dark colors.
 * @returns the window backing color used outside transparent macOS windows.
 */
export function nativeThemeBackgroundColor(dark: boolean): string {
  return dark ? '#171717' : '#ffffff'
}
