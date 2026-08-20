#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { access, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const appRoot = resolve(import.meta.dirname, '..')
const releaseRoot = resolve(appRoot, 'release')
const SMOKE_TIMEOUT_MS = 90_000

async function findNamed(root, predicate, depth = 0) {
  if (depth > 4) return undefined
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name)
    if (predicate(absolute, entry)) return absolute
    if (entry.isDirectory()) {
      const nested = await findNamed(absolute, predicate, depth + 1)
      if (nested !== undefined) return nested
    }
  }
  return undefined
}

async function packagedExecutable() {
  if (process.platform === 'darwin') {
    const app = await findNamed(releaseRoot, (path, entry) => entry.isDirectory() && path.endsWith('.app'))
    if (app === undefined) throw new Error(`No packaged .app found under ${releaseRoot}`)
    return join(app, 'Contents', 'MacOS', 'pilot-harness')
  }
  const expected = process.platform === 'win32' ? 'pilot-harness.exe' : 'pilot-harness'
  const executable = await findNamed(releaseRoot, (path, entry) => (
    entry.isFile() && basename(path).toLowerCase() === expected
    && path.includes(process.platform === 'win32' ? 'win-unpacked' : 'linux-unpacked')
  ))
  if (executable === undefined) throw new Error(`No packaged ${expected} found under ${releaseRoot}`)
  return executable
}

const smokeRoot = await mkdtemp(join(tmpdir(), 'pilot-harness-packaged-smoke-'))
const screenshot = join(smokeRoot, 'loaded.png')
try {
  const executable = await packagedExecutable()
  await access(executable)
  const childEnv = {
    ...process.env,
    PILOT_HARNESS_DSH_HOME: join(smokeRoot, 'harness'),
    PILOT_HARNESS_SMOKE_SCREENSHOT: screenshot,
  }
  delete childEnv.ELECTRON_RUN_AS_NODE
  const exitCode = await new Promise((resolveExit, rejectExit) => {
    const child = spawn(executable, [`--user-data-dir=${join(smokeRoot, 'profile')}`], {
      cwd: smokeRoot,
      env: childEnv,
      stdio: 'inherit',
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      rejectExit(new Error(`Packaged desktop smoke timed out after ${SMOKE_TIMEOUT_MS}ms`))
    }, SMOKE_TIMEOUT_MS)
    child.once('error', (error) => {
      clearTimeout(timer)
      rejectExit(error)
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      resolveExit(code ?? 1)
    })
  })
  if (exitCode !== 0) throw new Error(`Packaged desktop exited with code ${exitCode}`)
  await access(screenshot)
  console.log(`Packaged desktop loaded Harness successfully: ${executable}`)
} finally {
  await rm(smokeRoot, { recursive: true, force: true })
}
