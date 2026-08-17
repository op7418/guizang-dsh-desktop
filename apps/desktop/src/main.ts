import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  session,
  shell,
} from 'electron'
import { extractHarnessServerUrl, LineBuffer } from './server-url.ts'

const STARTUP_TIMEOUT_MS = 60_000
const MAX_LOG_LINES = 300

let mainWindow: BrowserWindow | null = null
let harnessProcess: ChildProcessWithoutNullStreams | null = null
let harnessUrl: string | null = null
let launchGeneration = 0
let launchPromise: Promise<void> | null = null
let quitting = false
let smokeCaptured = false
const logLines: string[] = []

/** Keep a bounded diagnostic tail without printing credentials into the UI. */
function rememberLog(source: 'stdout' | 'stderr' | 'desktop', line: string): void {
  const sanitized = line
    .replace(/(api[_-]?key|authorization|token)(\s*[:=]\s*)\S+/gi, '$1$2[redacted]')
    .slice(0, 2_000)
  logLines.push(`[${source}] ${sanitized}`)
  if (logLines.length > MAX_LOG_LINES) logLines.splice(0, logLines.length - MAX_LOG_LINES)
}

function diagnostics(): string {
  return [
    `Pilot Harness ${app.getVersion()}`,
    `platform=${process.platform} arch=${process.arch}`,
    `electron=${process.versions.electron}`,
    `dshHome=${resolveDshHome()}`,
    '',
    ...logLines,
  ].join('\n')
}

function resolveDshHome(): string {
  return process.env.PILOT_HARNESS_DSH_HOME
    ?? join(app.getPath('userData'), 'harness')
}

function resolveDshEntry(): string {
  const override = process.env.PILOT_HARNESS_DSH_ENTRY
  if (override !== undefined && override !== '') return resolve(override)
  if (app.isPackaged) {
    return join(app.getAppPath(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  }
  return resolve(app.getAppPath(), '../cli/lib/bin.js')
}

function shellFilePath(): string {
  return join(__dirname, 'shell.html')
}

function applicationIconPath(): string {
  return join(__dirname, 'icon.png')
}

async function showShell(state: 'loading' | 'failed', message = ''): Promise<void> {
  if (mainWindow === null || mainWindow.isDestroyed()) return
  try {
    await mainWindow.loadFile(shellFilePath(), { query: { state, message } })
  } catch (error) {
    // A newer recovery/navigation request may supersede this one.
    if (!String(error).includes('ERR_ABORTED')) throw error
  }
}

function titleBarOverlay(): Electron.TitleBarOverlayOptions {
  const dark = nativeTheme.shouldUseDarkColors
  return {
    color: '#00000000',
    symbolColor: dark ? '#d4d4d8' : '#888888',
    height: 44,
  }
}

function applyTitleBarTheme(): void {
  if (process.platform !== 'win32' || mainWindow === null || mainWindow.isDestroyed()) return
  mainWindow.setTitleBarOverlay(titleBarOverlay())
}

function isAllowedNavigation(target: string): boolean {
  if (target.startsWith('file:')) {
    try {
      const parsed = new URL(target)
      parsed.search = ''
      parsed.hash = ''
      return parsed.href === pathToFileURL(shellFilePath()).href
    } catch {
      return false
    }
  }
  if (harnessUrl === null) return false
  try {
    return new URL(target).origin === new URL(harnessUrl).origin
  } catch {
    return false
  }
}

function installNavigationPolicy(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (isAllowedNavigation(url)) return
    event.preventDefault()
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
  })
  window.webContents.on('will-redirect', (event, url) => {
    if (isAllowedNavigation(url)) return
    event.preventDefault()
  })
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 940,
    minHeight: 640,
    show: false,
    title: 'Pilot Harness',
    icon: applicationIconPath(),
    backgroundColor: process.platform === 'darwin'
      ? '#00ffffff'
      : (nativeTheme.shouldUseDarkColors ? '#171717' : '#ffffff'),
    ...(process.platform === 'darwin'
      ? {
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 20, y: 21 },
        vibrancy: 'under-window',
        transparent: true,
        visualEffectState: 'followWindow',
      }
      : process.platform === 'win32'
        ? { titleBarStyle: 'hidden', titleBarOverlay: titleBarOverlay() }
        : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  })

  installNavigationPolicy(window)
  window.once('ready-to-show', () => { window.show() })
  window.on('closed', () => { if (mainWindow === window) mainWindow = null })
  window.webContents.on('did-finish-load', async () => {
    const current = window.webContents.getURL()
    if (harnessUrl === null || !isAllowedNavigation(current)) return
    try {
      const smokePath = process.env.PILOT_HARNESS_SMOKE_SCREENSHOT
      if (smokePath !== undefined && smokePath !== '' && !smokeCaptured) {
        smokeCaptured = true
        setTimeout(() => {
          void window.webContents.capturePage().then((image) => {
            writeFileSync(resolve(smokePath), image.toPNG())
            app.quit()
          }).catch((error: unknown) => {
            rememberLog('desktop', `smoke screenshot failed: ${String(error)}`)
            process.exitCode = 1
            app.quit()
          })
        }, 1_500)
      }
    } catch (error) {
      rememberLog('desktop', `smoke screenshot failed: ${String(error)}`)
    }
  })
  return window
}

function stopHarness(): Promise<void> {
  const child = harnessProcess
  harnessProcess = null
  harnessUrl = null
  launchGeneration++
  if (child === null || child.exitCode !== null) return Promise.resolve()
  return new Promise((resolveStop) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      resolveStop()
    }
    child.once('exit', finish)
    terminateHarnessProcess(child, false)
    setTimeout(() => {
      if (child.exitCode === null) terminateHarnessProcess(child, true)
      finish()
    }, 2_000).unref()
  })
}

/** Stop the whole spawned Harness tree with platform-native semantics. */
function terminateHarnessProcess(child: ChildProcessWithoutNullStreams, force: boolean): void {
  if (process.platform === 'win32' && child.pid !== undefined) {
    const killer = spawn('taskkill', [
      '/pid', String(child.pid), '/t', ...(force ? ['/f'] : []),
    ], { windowsHide: true, stdio: 'ignore' })
    killer.unref()
    return
  }
  child.kill(force ? 'SIGKILL' : 'SIGTERM')
}

function launchHarness(): Promise<string> {
  const entry = resolveDshEntry()
  if (!existsSync(entry)) {
    return Promise.reject(new Error(`DeepSeek Harness runtime is missing: ${entry}. Run pnpm run build before desktop:dev.`))
  }

  const dshHome = resolveDshHome()
  mkdirSync(dshHome, { recursive: true })
  const patchPath = join(__dirname, 'pilot-harness.patch.yml')
  const generation = ++launchGeneration
  const child = spawn(process.execPath, [
    entry,
    'web',
    '--patch',
    patchPath,
    '--host',
    '127.0.0.1',
    '--port',
    '0',
  ], {
    cwd: app.getPath('home'),
    env: {
      ...process.env,
      DSH_HOME: dshHome,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdin.end()
  harnessProcess = child

  return new Promise((resolveLaunch, rejectLaunch) => {
    let settled = false
    const stdout = new LineBuffer()
    const stderr = new LineBuffer()
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      rejectLaunch(new Error(`DeepSeek Harness did not become ready within ${STARTUP_TIMEOUT_MS / 1_000} seconds.`))
    }, STARTUP_TIMEOUT_MS)

    const acceptLine = (source: 'stdout' | 'stderr', line: string): void => {
      rememberLog(source, line)
      if (settled || generation !== launchGeneration) return
      const url = extractHarnessServerUrl(line)
      if (url === undefined) return
      settled = true
      clearTimeout(timer)
      resolveLaunch(url)
    }

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      for (const line of stdout.push(chunk)) acceptLine('stdout', line)
    })
    child.stderr.on('data', (chunk: string) => {
      for (const line of stderr.push(chunk)) acceptLine('stderr', line)
    })
    child.once('error', (error) => {
      if (settled || generation !== launchGeneration) return
      settled = true
      clearTimeout(timer)
      rejectLaunch(error)
    })
    child.once('exit', (code, signal) => {
      for (const line of stdout.flush()) acceptLine('stdout', line)
      for (const line of stderr.flush()) acceptLine('stderr', line)
      rememberLog('desktop', `harness exited code=${String(code)} signal=${String(signal)}`)
      if (generation !== launchGeneration || quitting) return
      harnessProcess = null
      harnessUrl = null
      if (!settled) {
        settled = true
        clearTimeout(timer)
        rejectLaunch(new Error(`DeepSeek Harness exited before startup (code ${String(code)}).`))
        return
      }
      void showShell('failed', `DeepSeek Harness stopped unexpectedly (code ${String(code)}).`)
    })
  })
}

async function restartHarness(): Promise<void> {
  if (launchPromise !== null) return launchPromise
  launchPromise = (async () => {
    await showShell('loading')
    await stopHarness()
    try {
      const url = await launchHarness()
      harnessUrl = url
      if (mainWindow !== null && !mainWindow.isDestroyed()) await mainWindow.loadURL(url)
    } catch (error) {
      rememberLog('desktop', `startup failed: ${String(error)}`)
      await showShell('failed', error instanceof Error ? error.message : String(error))
    }
  })().finally(() => { launchPromise = null })
  return launchPromise
}

/** Open the desktop-owned project chooser used by the directory-picker UI plugin. */
async function pickDirectory(): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: '选择项目目录',
    buttonLabel: '选择文件夹',
    properties: ['openDirectory', 'createDirectory'],
  }
  const result = mainWindow !== null && !mainWindow.isDestroyed()
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? null : result.filePaths[0] ?? null
}

function installMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{ role: 'appMenu' as const }]
      : []),
    {
      label: 'Harness',
      submenu: [
        { label: 'Restart Harness', accelerator: 'CmdOrCtrl+Shift+R', click: () => { void restartHarness() } },
        { label: 'Open Data Folder', click: () => { void shell.openPath(resolveDshHome()) } },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      role: 'viewMenu',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const }]),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'DeepSeek Harness on GitHub', click: () => { void shell.openExternal('https://github.com/deepseek-ai/deepseek-harness') } },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow === null) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    if (process.platform === 'darwin') app.dock?.setIcon(applicationIconPath())
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => { callback(false) })
    ipcMain.handle('pilot-harness:restart', async () => { await restartHarness(); return harnessUrl !== null })
    ipcMain.handle('pilot-harness:pick-directory', pickDirectory)
    ipcMain.handle('pilot-harness:show-data-folder', async () => {
      mkdirSync(resolveDshHome(), { recursive: true })
      return (await shell.openPath(resolveDshHome())) === ''
    })
    ipcMain.handle('pilot-harness:copy-diagnostics', () => { clipboard.writeText(diagnostics()); return true })
    nativeTheme.on('updated', applyTitleBarTheme)
    installMenu()
    mainWindow = createWindow()
    await showShell('loading')
    await restartHarness()
  }).catch((error) => {
    rememberLog('desktop', `fatal startup error: ${String(error)}`)
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length > 0) return
    mainWindow = createWindow()
    if (harnessUrl === null) void restartHarness()
    else void mainWindow.loadURL(harnessUrl)
  })

  app.on('before-quit', () => {
    quitting = true
    if (harnessProcess !== null && harnessProcess.exitCode === null) {
      terminateHarnessProcess(harnessProcess, false)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
