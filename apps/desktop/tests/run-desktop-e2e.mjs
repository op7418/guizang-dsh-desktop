import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const auditDirectory = process.env.PILOT_HARNESS_E2E_AUDIT === undefined
  ? await mkdtemp(join(tmpdir(), 'pilot-harness-runtime-audit-'))
  : undefined
const auditPath = process.env.PILOT_HARNESS_E2E_AUDIT ?? join(auditDirectory, 'runtime.json')
const childEnv = { ...process.env, PILOT_HARNESS_E2E_AUDIT: auditPath }
delete childEnv.ELECTRON_RUN_AS_NODE

function run(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: appRoot,
      env: childEnv,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', code => { resolveRun(code ?? 1) })
  })
}

let e2eCode = 1
let auditCode = 1
try {
  e2eCode = await run(['tests/desktop-picker.e2e.mjs'])
  try {
    await access(auditPath)
    auditCode = await run(['scripts/audit-codepilot-ui.mjs', '--runtime-only', '--runtime', auditPath])
  } catch (error) {
    console.error(`desktop E2E did not produce a runtime audit: ${String(error)}`)
  }
} finally {
  if (auditDirectory !== undefined) {
    await rm(auditDirectory, { recursive: true, force: true })
  }
}

process.exitCode = e2eCode === 0 && auditCode === 0 ? 0 : 1
