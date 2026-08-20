import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeNativeThemeSource, isNativeThemeSource, nativeThemeBackgroundColor } from '../src/native-theme.ts'

void test('native theme IPC accepts only Electron theme sources', () => {
  for (const source of ['system', 'light', 'dark']) assert.equal(isNativeThemeSource(source), true)
  for (const source of [undefined, null, '', 'auto', 'sepia', 1, {}]) {
    assert.equal(isNativeThemeSource(source), false)
  }
})

void test('persisted native theme source falls back safely after corruption', () => {
  assert.equal(decodeNativeThemeSource(' dark\n'), 'dark')
  assert.equal(decodeNativeThemeSource('sepia'), 'system')
  assert.equal(decodeNativeThemeSource(undefined), 'system')
})

void test('native theme selects the matching opaque backing color', () => {
  assert.equal(nativeThemeBackgroundColor(false), '#ffffff')
  assert.equal(nativeThemeBackgroundColor(true), '#171717')
})

void test('desktop theme bridge validates renderer input before mutating nativeTheme', () => {
  const root = resolve(import.meta.dirname, '..')
  const preload = readFileSync(resolve(root, 'src/preload.ts'), 'utf8')
  const main = readFileSync(resolve(root, 'src/main.ts'), 'utf8')

  assert.match(preload, /ipcRenderer\.invoke\('pilot-harness:set-theme-source', source\)/)
  assert.match(main, /ipcMain\.handle\('pilot-harness:set-theme-source'/)
  assert.match(main, /isAllowedNavigation\(event\.senderFrame\?\.url \?\? ''\)/)
  assert.match(main, /if \(!isNativeThemeSource\(source\)\) return false/)
  assert.match(main, /nativeTheme\.themeSource = source/)
  assert.match(main, /persistNativeThemeSource\(source\)/)
})
