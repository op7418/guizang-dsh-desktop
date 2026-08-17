import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { startMockLlmServer } from '../../../packages/test-support/llm-mock-server/lib/index.js'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(appRoot, '../..')
const repoName = basename(repoRoot)
const testHome = await mkdtemp(join(tmpdir(), 'pilot-harness-e2e-'))
const worktreeFixture = join(testHome, 'worktree-fixture')
await mkdir(worktreeFixture, { recursive: true })
await writeFile(join(worktreeFixture, 'seed.txt'), 'Pilot Harness worktree fixture\n')
const screenshotDir = process.env.PILOT_HARNESS_E2E_SCREENSHOTS
const auditOutput = process.env.PILOT_HARNESS_E2E_AUDIT
const chatWidth = Number(process.env.PILOT_HARNESS_E2E_WIDTH ?? 1440)
const chatHeight = Number(process.env.PILOT_HARNESS_E2E_HEIGHT ?? 900)
const settingsHeight = Number(process.env.PILOT_HARNESS_E2E_SETTINGS_HEIGHT ?? 845)
const runtimeAudit = {
  generatedAt: new Date().toISOString(),
  expected: {
    chatViewport: { width: chatWidth, height: chatHeight },
    settingsViewport: { width: chatWidth, height: settingsHeight },
  },
  states: {},
}
const pageErrors = []
const pageWarnings = []
const mockLlm = await startMockLlmServer({
  sequence: ['reasoning_success'],
  repeatLast: true,
  apiKey: 'pilot-harness-e2e-key',
  reasoningText: 'Inspect the request context\nCheck the available workspace\nPrepare the concise answer',
  successText: 'Pilot Harness mock response',
  chunkSize: 24,
})

async function capture(page, name, scale = 'css') {
  if (!screenshotDir) return
  await mkdir(screenshotDir, { recursive: true })
  await page.screenshot({ path: join(screenshotDir, name), fullPage: true, scale })
}

async function inspectState(page, selectors) {
  return page.evaluate((requested) => {
    const root = getComputedStyle(document.documentElement)
    const body = getComputedStyle(document.body)
    const elements = Object.fromEntries(Object.entries(requested).map(([name, selector]) => {
      const element = document.querySelector(selector)
      if (!(element instanceof Element)) return [name, null]
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return [name, {
        selector,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        client: { width: element.clientWidth, height: element.clientHeight },
        background: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: style.color,
        borderWidth: style.borderWidth,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        position: style.position,
        padding: style.padding,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        appRegion: style.getPropertyValue('-webkit-app-region'),
      }]
    }))
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      body: {
        paddingTop: body.paddingTop,
        background: body.backgroundColor,
        fontFamily: body.fontFamily,
        dragStrip: getComputedStyle(document.body, '::before').getPropertyValue('-webkit-app-region'),
      },
      tokens: Object.fromEntries([
        '--pilot-radius-base', '--pilot-composer-radius', '--pilot-nav-radius',
        '--pilot-input-radius', '--pilot-menu-radius', '--pilot-sidebar-width',
        '--pilot-background', '--pilot-foreground', '--pilot-border', '--pilot-shadow-diffuse',
        '--pilot-text-primary', '--pilot-text-secondary', '--pilot-text-muted', '--pilot-text-caption',
      ].map(name => [name, root.getPropertyValue(name).trim()])),
      elements,
    }
  }, selectors)
}

function geometrySignature(state) {
  return JSON.stringify(Object.fromEntries(Object.entries(state.elements).map(([name, element]) => [
    name,
    element === null
      ? null
      : {
          box: Object.fromEntries(Object.entries(element.box).map(([key, value]) => [key, Math.round(value * 100) / 100])),
          borderRadius: element.borderRadius,
        },
  ])))
}

async function inspectStableState(page, selectors, { timeout = 3_000, interval = 50 } = {}) {
  const deadline = Date.now() + timeout
  let previous = ''
  let stableSamples = 0
  let state
  while (Date.now() < deadline) {
    state = await inspectState(page, selectors)
    const signature = geometrySignature(state)
    if (signature === previous) stableSamples += 1
    else stableSamples = 0
    if (stableSamples >= 2) return state
    previous = signature
    await page.waitForTimeout(interval)
  }
  throw new Error(`desktop geometry did not settle within ${timeout}ms`)
}

/** Retry delayed hover surfaces after moving off the trigger first. Electron
 * can occasionally drop a synthetic hover while a native window resize or
 * compositor transition is settling; a bounded retry tests the interaction
 * without turning that scheduling race into a 30-second suite failure. */
async function hoverUntilVisible(page, trigger, target, { attempts = 3, timeout = 2_000 } = {}) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await page.mouse.move(2, 2)
    await trigger.hover({ force: true })
    try {
      await target.waitFor({ state: 'visible', timeout })
      return
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function near(actual, expected, tolerance = 0.5) {
  return typeof actual === 'number' && Math.abs(actual - expected) <= tolerance
}

async function persistRuntimeAudit() {
  if (!auditOutput) return
  await mkdir(dirname(auditOutput), { recursive: true })
  await writeFile(auditOutput, `${JSON.stringify(runtimeAudit, null, 2)}\n`)
}

const desktopEnv = { ...process.env }
delete desktopEnv.ELECTRON_RUN_AS_NODE

const electronApp = await electron.launch({
  // Isolate Chromium and Electron's single-instance lock from any developer
  // client that may already be running while this regression test executes.
  args: ['.', `--user-data-dir=${join(testHome, 'electron-profile')}`],
  cwd: appRoot,
  env: { ...desktopEnv, PILOT_HARNESS_DSH_HOME: testHome },
})

try {
  const page = await electronApp.firstWindow()
  page.on('pageerror', error => { pageErrors.push(`pageerror: ${error.message}`) })
  page.on('console', message => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
    if (message.type() === 'warning') pageWarnings.push(`console: ${message.text()}`)
  })
  await electronApp.evaluate(({ BrowserWindow }, size) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(size.width, size.height)
  }, { width: chatWidth, height: chatHeight })
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForFunction(() => document.documentElement.dataset.codepilotTheme === 'true')
  } catch (error) {
    await capture(page, '00-theme-plugin-failure.png')
    await page.evaluate(() => window.pilotHarness?.copyDiagnostics()).catch(() => undefined)
    const diagnostics = await electronApp.evaluate(({ clipboard }) => clipboard.readText()).catch(() => '')
    const startupState = await page.evaluate(() => ({
      url: location.href,
      text: document.body.innerText,
      marker: document.documentElement.dataset.codepilotTheme,
      pluginStyles: [...document.querySelectorAll('style[data-plugin]')].map(node => node.getAttribute('data-plugin')),
    })).catch(() => undefined)
    throw new Error(`CodePilot theme plugin did not activate: ${JSON.stringify({ startupState, diagnostics, pageErrors, pageWarnings })}\n${String(error)}`)
  }
  try {
    await page.waitForFunction(() => document.body.innerText.includes('Workspaces'))
  } catch (error) {
    await capture(page, '00-startup-failure.png')
    const startupText = await page.locator('body').innerText().catch(() => '')
    throw new Error(`desktop did not reach the workspace UI: ${startupText}\n${String(error)}`)
  }

  const bridge = await page.evaluate(() => ({
    pickDirectory: typeof window.pilotHarness?.pickDirectory,
    platform: window.pilotHarness?.platform,
  }))
  if (bridge.pickDirectory !== 'function') throw new Error('desktop directory bridge is unavailable')

  // Replace the application IPC boundary rather than monkey-patching
  // Electron's native dialog module. The latter is not writable consistently
  // on every Linux runner and can leave an unseen system chooser blocking the
  // test even though the product bridge itself is healthy.
  await electronApp.evaluate(({ ipcMain }, path) => {
    globalThis.__pilotHarnessE2EPath = path
    ipcMain.removeHandler('pilot-harness:pick-directory')
    ipcMain.handle('pilot-harness:pick-directory', () => globalThis.__pilotHarnessE2EPath)
  }, repoRoot)

  const addWorkspace = page.getByRole('button', { name: /add workspace/i }).last()
  const directoryBrowser = page.getByRole('dialog', { name: 'Select Workspace Directory', exact: true })
  async function addWorkspacePath(path, expectedName = basename(path)) {
    await electronApp.evaluate((_, selectedPath) => { globalThis.__pilotHarnessE2EPath = selectedPath }, path)
    await addWorkspace.click()

    // Linux intentionally uses the in-app directory browser instead of the
    // native bridge. Exercise that real fallback; macOS and Windows resolve
    // directly through the test IPC handler and never render this dialog.
    await directoryBrowser.waitFor({ timeout: 1_500 }).catch(() => undefined)
    if (await directoryBrowser.isVisible().catch(() => false)) {
      await directoryBrowser.getByRole('button', { name: 'Edit path', exact: true }).click()
      const pathEditor = directoryBrowser.getByRole('textbox', { name: 'Edit path', exact: true })
      await pathEditor.fill(path)
      await pathEditor.press('Enter')
      await pathEditor.waitFor({ state: 'detached' })
      await directoryBrowser.getByRole('button', { name: 'Open', exact: true }).click()
    }

    const row = page.getByRole('treeitem').filter({ hasText: expectedName }).first()
    try {
      await row.waitFor()
    } catch (error) {
      const workspaceState = await page.evaluate(() => ({
        body: document.body.innerText,
        rows: [...document.querySelectorAll('[role="treeitem"]')].map(node => node.textContent),
      })).catch(() => undefined)
      throw new Error(`selected workspace did not enter the sidebar: ${JSON.stringify({ path, expectedName, workspaceState, pageErrors, pageWarnings })}\n${String(error)}`)
    }
    return row
  }

  const rootProject = await addWorkspacePath(repoRoot, repoName)

  // First-run onboarding starts only after the project has been accepted. It
  // is intentionally blocking from this point; complete the notice and take
  // the supported "later" path so the remaining project interactions run.
  await page.waitForTimeout(500)
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true })
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click()
    const configureLater = page.getByRole('button', { name: 'Configure later', exact: true })
    if (await configureLater.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await configureLater.click()
    }
    await page.getByRole('dialog').waitFor({ state: 'detached' })
  }

  const desktopProject = await addWorkspacePath(appRoot, 'desktop')
  await desktopProject.click()
  try {
    await page.waitForFunction(() => document.querySelector('[role="treeitem"][aria-current="true"]')?.textContent?.includes('desktop'), undefined, { timeout: 5_000 })
  } catch (error) {
    await capture(page, '00-workspace-selection-failure.png')
    const rows = await page.locator('[role="treeitem"]').evaluateAll(nodes => nodes.map(node => ({
      text: node.textContent,
      current: node.getAttribute('aria-current'),
      expanded: node.getAttribute('aria-expanded'),
    })))
    const desktopMarker = await page.evaluate(() => ({
      value: document.documentElement.dataset.pilotDesktop,
      platform: document.documentElement.dataset.pilotPlatform,
    }))
    throw new Error(`desktop project did not become current: ${JSON.stringify({ rows, desktopMarker, pageErrors, pageWarnings })}\n${String(error)}`)
  }
  await rootProject.click()
  await page.waitForFunction(expected => document.querySelector('[role="treeitem"][aria-current="true"]')?.textContent?.includes(expected), repoName)
  // Move away from the project row so this frame audits persistent selection,
  // not the legitimate transient hover fill.
  await page.mouse.move(chatWidth - 80, Math.floor(chatHeight / 2))
  await capture(page, '01-chat-input.png')
  if (await page.locator("[class*='_footerActions']").getByRole('button', { name: 'Files', exact: true }).count() !== 0) {
    throw new Error('Files still renders as a duplicate left-sidebar action')
  }
  runtimeAudit.states.chat = await inspectState(page, {
    frame: "#root > [class*='_frame']",
    sidebar: "[class*='_sidebarCol']",
    titlebar: "[data-pilot-sidebar='header']",
    sidebarToggle: '[data-pilot-sidebar-toggle]',
    composer: "[class*='_composerHero'] [class*='_card']",
    workspaceRow: "[class*='_composerHero'] [class*='_heroWorkspaceRow']",
    projectRow: "[class*='_projectRow']",
    projectFolder: "[class*='_projectRow'][aria-current='true'] [class*='_folder']",
  })
  const sidebarToggle = runtimeAudit.states.chat.elements.sidebarToggle?.box
  if (runtimeAudit.states.chat.body.dragStrip !== 'drag') {
    throw new Error('desktop fallback titlebar is not draggable')
  }
  if (runtimeAudit.states.chat.elements.titlebar?.appRegion !== 'drag') {
    throw new Error('visible sidebar titlebar is not draggable')
  }
  if (bridge.platform === 'darwin' && (sidebarToggle === undefined || sidebarToggle.x < 84)) {
    throw new Error('sidebar toggle overlaps the macOS traffic-light area')
  }
  if (runtimeAudit.states.chat.elements.projectRow?.background !== 'rgba(0, 0, 0, 0)') {
    throw new Error('the current Workspace row still uses a selected background instead of leaving selection to its Session')
  }

  const sidebarToggleButton = page.locator('[data-pilot-sidebar-toggle]')
  await sidebarToggleButton.click()
  await page.locator('[data-sidebar-collapsed]').waitFor()
  // AppFrame marks the track as collapsed before SidebarRoot swaps from its
  // frozen wide children to the rail composition. Wait for that semantic
  // state, then poll geometry through the remaining rail-entry animation.
  await page.locator("[data-pilot-workspaces='rail']").waitFor()
  await page.locator("[data-pilot-brand-mark='rail']").waitFor()
  runtimeAudit.states.collapsedSidebar = await inspectStableState(page, {
    sidebarToggle: "[data-pilot-brand-mark='rail']",
    chatControl: "[data-pilot-sidebar='root'] [data-pilot-nav='new-session']",
    chatIcon: "[data-pilot-sidebar='root'] [data-pilot-nav='new-session'] > svg",
    workspaceControl: "[data-pilot-workspaces='rail'] [data-pilot-workspaces-add-button]",
    workspaceIcon: "[data-pilot-workspaces='rail'] [data-pilot-workspaces-add-button] > svg",
    searchControl: "[data-pilot-workspaces='rail'] [data-pilot-workspaces-search-button]",
    searchIcon: "[data-pilot-workspaces='rail'] [data-pilot-workspaces-search-button] > svg",
  })
  await persistRuntimeAudit()
  const collapsedToggle = runtimeAudit.states.collapsedSidebar.elements.sidebarToggle?.box
  if (bridge.platform === 'darwin' && (collapsedToggle === undefined || collapsedToggle.y < 44)) {
    throw new Error('collapsed sidebar toggle overlaps the macOS traffic-light area')
  }
  const railElements = runtimeAudit.states.collapsedSidebar.elements
  const railControls = [railElements.sidebarToggle, railElements.chatControl, railElements.workspaceControl, railElements.searchControl]
  const railActionControls = [railElements.chatControl, railElements.workspaceControl, railElements.searchControl]
  const railIcons = [railElements.chatIcon, railElements.workspaceIcon, railElements.searchIcon]
  if (railControls.some(control => !near(control?.box?.width, 36) || !near(control?.box?.height, 36))) {
    throw new Error('collapsed sidebar controls must share the 36px CodePilot hit area')
  }
  if (railIcons.some(icon => !near(icon?.box?.width, 16) || !near(icon?.box?.height, 16))) {
    throw new Error('collapsed sidebar glyphs must share the canonical 16px CodePilot icon size')
  }
  if (railActionControls.some((control, index) => control === null || control === undefined
    || railIcons[index] === null || railIcons[index] === undefined
    || Math.abs((control.box.x + control.box.width / 2) - (railIcons[index].box.x + railIcons[index].box.width / 2)) > 1
    || control.borderRadius !== '8px')) {
    throw new Error('collapsed sidebar glyphs must be centered in matching 8px nav controls')
  }
  if (railElements.sidebarToggle === null || railElements.sidebarToggle === undefined
    || railElements.chatControl === null || railElements.chatControl === undefined
    || Math.abs((railElements.sidebarToggle.box.x + railElements.sidebarToggle.box.width / 2)
      - (railElements.chatControl.box.x + railElements.chatControl.box.width / 2)) > 1) {
    throw new Error('collapsed sidebar brand control must share the navigation rail centerline')
  }
  const chatControl = railElements.chatControl?.box
  const workspaceControl = railElements.workspaceControl?.box
  const searchControl = railElements.searchControl?.box
  if (chatControl === undefined || workspaceControl === undefined || searchControl === undefined
    || !near(workspaceControl.y - (chatControl.y + chatControl.height), 4)
    || !near(searchControl.y - (workspaceControl.y + workspaceControl.height), 4)) {
    throw new Error('collapsed sidebar controls must use the 4px CodePilot navigation rhythm')
  }
  await capture(page, '01b-collapsed-sidebar.png')
  await sidebarToggleButton.click()
  await page.locator('[data-sidebar-collapsed]').waitFor({ state: 'detached' })
  await page.locator("[data-pilot-workspaces='wide']").waitFor()
  await inspectStableState(page, { sidebar: "[data-pilot-sidebar='root']" })

  runtimeAudit.states.workspaceChip = await inspectState(page, {
    control: "[class*='_composerHero'] button[class*='_workspace']",
    icon: "[class*='_composerHero'] button[class*='_workspace'] > svg:first-child",
    label: "[class*='_composerHero'] button[class*='_workspace'] [class*='_workspaceLabel']",
    chevron: "[class*='_composerHero'] button[class*='_workspace'] > svg:last-child",
  })
  const workspaceChip = runtimeAudit.states.workspaceChip.elements
  const workspaceChipControl = workspaceChip.control?.box
  const workspaceChipIcon = workspaceChip.icon?.box
  const workspaceChipLabel = workspaceChip.label?.box
  const workspaceChipChevron = workspaceChip.chevron?.box
  if (!near(workspaceChipControl?.height, 28) || !near(workspaceChipIcon?.width, 14) || !near(workspaceChipIcon?.height, 14)) {
    throw new Error('workspace selector must use the 28px control and 14px inline CodePilot icon')
  }
  if (workspaceChipIcon === undefined || workspaceChipLabel === undefined || workspaceChipChevron === undefined
    || Math.abs((workspaceChipIcon.y + workspaceChipIcon.height / 2) - (workspaceChipLabel.y + workspaceChipLabel.height / 2)) > 1
    || !near(workspaceChipLabel.x - (workspaceChipIcon.x + workspaceChipIcon.width), 6)
    || !near(workspaceChipChevron.x - (workspaceChipLabel.x + workspaceChipLabel.width), 6)
    || workspaceChip.label?.padding !== '0px'
    || !near(workspaceChipLabel.height, 20)) {
    throw new Error('workspace selector icon, label, and chevron must share one baseline and 6px rhythm')
  }

  const workspacePicker = page.getByRole('button', { name: /choose workspace/i }).first()
  await workspacePicker.click()
  await page.getByRole('menu').waitFor()
  await capture(page, '02-workspace-menu.png')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('dialog').waitFor()
  await electronApp.evaluate(({ BrowserWindow }, size) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(size.width, size.height)
  }, { width: chatWidth, height: settingsHeight })
  await page.getByRole('button', { name: 'Providers', exact: true }).click()
  await page.getByText('Add provider', { exact: true }).waitFor()
  await capture(page, '03-provider-settings.png')
  runtimeAudit.states.providers = await inspectState(page, {
    settingsPanel: "[class*='_panel']:has(> [class*='_nav'] [class*='_navTitle'])",
    settingsNav: "[class*='_panel'] > [class*='_nav']:has([class*='_navTitle'])",
    settingsOptions: "[class*='_options']",
    providerAction: "[class*='_options'] [class*='_addButton']",
  })
  const settingsNavSurface = runtimeAudit.states.providers.elements.settingsNav
  if (settingsNavSurface?.background === 'rgba(0, 0, 0, 0)' || settingsNavSurface?.backgroundImage !== 'none') {
    throw new Error('settings traffic-light area must use one continuous sidebar surface')
  }

  // Exercise the CodePilot DeepSeek route against a loopback mock endpoint so
  // the visual run can render a real completed reasoning block without using
  // an external credential or provider.
  await page.getByRole('button', { name: 'Add provider', exact: true }).click()
  await page.getByRole('heading', { name: 'Choose a provider', exact: true }).waitFor()
  const providerChoices = page.locator("button[class*='_providerChoice']")
  if (await providerChoices.count() === 0) throw new Error('provider picker has no provider cards')
  if (await providerChoices.filter({ hasText: /azure/i }).count() !== 0) {
    throw new Error('Azure leaked into the CodePilot-curated provider picker')
  }
  if (await providerChoices.filter({ hasText: /anthropic/i }).count() !== 0) {
    throw new Error('Anthropic leaked into the CodePilot-curated provider picker')
  }
  if (await providerChoices.first().locator('svg').count() === 0) {
    throw new Error('provider picker card is missing its provider icon')
  }
  await capture(page, '04-provider-picker.png')
  runtimeAudit.states.providerPicker = await inspectState(page, {
    picker: "[class*='_providerPicker']",
    search: "[class*='_providerSearch']",
    providerChoice: "button[class*='_providerChoice']",
    providerIcon: "[class*='_providerChoiceIcon']",
  })
  const deepseekChoice = providerChoices.filter({ hasText: /^deepseek/i }).first()
  if (await deepseekChoice.count() === 0) throw new Error('CodePilot provider picker has no DeepSeek route')
  await deepseekChoice.click()
  await page.getByLabel('API key', { exact: true }).fill('pilot-harness-e2e-key')
  await page.getByText('Customized settings', { exact: true }).click()
  await page.getByLabel('Base URL', { exact: true }).fill(mockLlm.baseURL)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Saved' }).waitFor()

  await page.getByRole('button', { name: 'Models', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search models' }).waitFor()
  if (await page.locator("[class*='_groupSummary']").filter({ hasText: /anthropic/i }).count() !== 0) {
    throw new Error('Anthropic leaked into the CodePilot model catalog')
  }
  await page.getByText(/provider.*model/i).first().waitFor()
  const modelTitleBox = await page.getByRole('heading', { name: 'Models', exact: true }).boundingBox()
  const modelSummaryBox = await page.getByText(/providers · .*models/, { exact: true }).boundingBox()
  if (modelTitleBox === null || modelSummaryBox === null || modelSummaryBox.x - modelTitleBox.x < 300) {
    throw new Error('model catalog summary must stay aligned to the far side of the heading')
  }
  const firstDefault = page.getByRole('button', { name: /^Set default / }).first()
  await firstDefault.click()
  const activatedDefault = page.getByRole('button', { name: /^Default / }).first()
  const saveFailure = page.getByRole('alert')
  const defaultOutcome = await Promise.race([
    activatedDefault.waitFor().then(() => 'saved'),
    saveFailure.waitFor().then(() => 'failed'),
  ])
  if (defaultOutcome === 'failed') {
    throw new Error(`default model mutation failed: ${await saveFailure.textContent()}`)
  }
  await capture(page, '05-model-settings.png')
  runtimeAudit.states.models = await inspectState(page, {
    modelToolbar: '[data-pilot-model-toolbar]',
    modelSearch: '[data-pilot-model-search]',
    modelGroup: '[data-pilot-model-group]',
    modelRow: '[data-pilot-model-row]',
  })

  await page.getByRole('button', { name: 'About', exact: true }).click()
  await page.getByRole('heading', { name: 'Pilot Harness', exact: true }).waitFor()
  await capture(page, '06-about-settings.png')
  runtimeAudit.states.about = await inspectState(page, {
    hero: "[class*='_heroCard']",
    brand: "[class*='_brandMark']",
    infoCard: "[class*='_infoCard']",
  })

  await page.getByRole('button', { name: 'General', exact: true }).click()
  await page.getByText('Configuration file', { exact: true }).waitFor()
  await capture(page, '07-general-settings.png')
  runtimeAudit.states.general = await inspectState(page, {
    settingsOptions: '[data-pilot-settings-options]',
    generalCard: '[data-pilot-settings-card="general"]',
    back: '[data-pilot-settings-back]',
    configRow: "[class*='_row']:has([class*='_copy'])",
    configIcon: "[class*='_row'] [class*='_icon']",
  })

  const generalOptionsBox = runtimeAudit.states.general.elements.settingsOptions?.box
  const generalCard = runtimeAudit.states.general.elements.generalCard
  const settingsBackBox = runtimeAudit.states.general.elements.back?.box
  const generalNavBox = await page.getByRole('button', { name: 'General', exact: true }).boundingBox()
  if (generalOptionsBox === undefined || generalCard === null || generalCard === undefined) {
    throw new Error('General settings card geometry is unavailable')
  }
  // Classic Windows scrollbars consume inline layout width. Center against
  // the scrollport's client box, not its border box, so the assertion follows
  // the surface users actually see on every platform.
  const optionsCenter = generalOptionsBox.x
    + (runtimeAudit.states.general.elements.settingsOptions?.client?.width ?? generalOptionsBox.width) / 2
  const cardCenter = generalCard.box.x + generalCard.box.width / 2
  if (Math.abs(optionsCenter - cardCenter) > 2) {
    throw new Error('General settings card is not centered inside the content column')
  }
  if (generalCard.borderRadius !== '14px' || generalCard.background === 'rgba(0, 0, 0, 0)') {
    throw new Error('General settings content is not rendered as the CodePilot card surface')
  }
  if (settingsBackBox === undefined || generalNavBox === null || settingsBackBox.y + settingsBackBox.height > generalNavBox.y) {
    throw new Error('Settings back button must sit above the General navigation row')
  }
  if (bridge.platform === 'darwin' && settingsBackBox.x < 84 && settingsBackBox.y < 44) {
    throw new Error('Settings back button overlaps the macOS traffic lights')
  }

  await page.getByRole('button', { name: 'Plugins', exact: true }).click()
  await page.getByRole('tab', { name: 'Plugin list', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search plugins', exact: true }).fill('codepilot-theme')
  await page.getByText('ui-codepilot-theme', { exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Search plugins', exact: true }).fill('schedule-summary')
  await page.getByText('ui-schedule-summary', { exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Search plugins', exact: true }).fill('codepilot-theme')
  await capture(page, '08-plugin-inventory.png')
  runtimeAudit.states.plugins = await inspectState(page, {
    themePlugin: "[data-plugin-entry='codepilot-theme']",
    pluginSearch: "input[aria-label='Search plugins']",
  })

  await page.locator('[data-pilot-settings-back]').click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await electronApp.evaluate(({ BrowserWindow }, size) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(size.width, size.height)
  }, { width: chatWidth, height: chatHeight })

  // The Worktree feature is mounted as one ordinary DSH plugin. Exercise its
  // Host and browser faces against a disposable workspace, including a safe
  // mutation, without touching the source checkout.
  const fixtureProject = await addWorkspacePath(worktreeFixture, 'worktree-fixture')
  await fixtureProject.click()
  // Header utilities belong to a real conversation, so create a disposable
  // Session in the fixture rather than relying on the removed sidebar entry.
  const fixtureComposer = page.locator('textarea').first()
  await fixtureComposer.fill('Inspect this workspace')
  await fixtureComposer.press('Enter')
  await page.getByText('Pilot Harness mock response', { exact: true }).last().waitFor({ timeout: 15_000 })

  // T3 Code inspired the information density, while the presentation remains
  // the existing CodePilot row + delayed hover card. Exercise that progressive
  // disclosure in the real shell and retain a visual audit state.
  if (await fixtureProject.getAttribute('aria-expanded') !== 'true') await fixtureProject.click()
  // The title plugin may replace the literal first prompt, so target the
  // selected Session fact instead of coupling this shell test to title copy.
  const fixtureSession = page.locator("[role='treeitem'][aria-selected='true']").last()
  await fixtureSession.waitFor()
  const sessionDetail = page.locator("[role='button'][aria-label^='Copy: ']").last()
  await hoverUntilVisible(page, fixtureSession, sessionDetail)
  await sessionDetail.getByText('Workspace', { exact: true }).waitFor()
  await sessionDetail.getByText('Model', { exact: true }).waitFor()
  await capture(page, '08b-session-detail.png')
  runtimeAudit.states.sessionDetail = await inspectState(page, {
    row: "[role='treeitem'][aria-selected='true']",
    hoverCard: "[role='button'][aria-label^='Copy: ']",
  })

  const filesToggle = page.getByRole('button', { name: 'Files', exact: true })
  await filesToggle.waitFor({ timeout: 15_000 })
  // At the minimum desktop viewport the layout solver protects the 640px
  // conversation floor by conceding the right dock before the left sidebar.
  // Collapse the left sidebar explicitly so the 320px Files dock can be
  // exercised without weakening that production layout contract.
  await sidebarToggleButton.click()
  await page.locator('[data-sidebar-collapsed]').waitFor()
  await page.locator("[data-pilot-workspaces='rail']").waitFor()
  await inspectStableState(page, { sidebar: "[data-pilot-sidebar='root']" })
  const conversationColumn = page.locator("[class*='_centerCol']").first()
  const conversationClosedBox = await conversationColumn.boundingBox()
  await filesToggle.click()
  const worktree = page.getByRole('complementary', { name: 'Files' })
  await worktree.waitFor()
  await worktree.getByText(/worktree-fixture · 1 files/).waitFor()
  const worktreeBox = await worktree.boundingBox()
  const conversationOpenBox = await conversationColumn.boundingBox()
  if (worktreeBox === null || conversationClosedBox === null || conversationOpenBox === null) {
    throw new Error('right-sidebar geometry is unavailable')
  }
  if (Math.abs(worktreeBox.x + worktreeBox.width - chatWidth) > 1
    || Math.abs(worktreeBox.y - conversationOpenBox.y) > 1
    || Math.abs(worktreeBox.height - conversationOpenBox.height) > 1) {
    throw new Error(`Files must render as a flush, full-height right sidebar: ${JSON.stringify({ worktreeBox, conversationOpenBox, chatWidth })}`)
  }
  if (conversationOpenBox.width >= conversationClosedBox.width) {
    throw new Error('opening Files must narrow the conversation layout column')
  }
  await worktree.getByRole('button', { name: 'New file', exact: true }).click()
  await worktree.getByRole('textbox', { name: 'File name', exact: true }).fill('created.md')
  await worktree.getByRole('button', { name: 'Create', exact: true }).click()
  await worktree.getByText('created.md', { exact: true }).waitFor()
  await worktree.getByText(/worktree-fixture · 2 files/).waitFor()
  const createdRow = worktree.locator("[class*='_row']").filter({ hasText: 'created.md' })
  await createdRow.hover()
  const createdActions = createdRow.getByRole('button', { name: 'More actions for created.md', exact: true })
  await createdActions.click()
  await page.getByRole('menuitem', { name: 'Open file', exact: true }).click()
  await createdActions.click()
  await page.getByRole('menuitem', { name: 'Add path to input', exact: true }).click()
  const insertedPath = await fixtureComposer.inputValue()
  if (insertedPath !== '@created.md ') {
    throw new Error(`Files row did not add its workspace-relative path to the composer: ${JSON.stringify(insertedPath)}`)
  }
  await fixtureComposer.fill('')
  await createdActions.click()
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click()
  await worktree.getByRole('textbox', { name: 'New name', exact: true }).fill('renamed.md')
  await worktree.getByRole('button', { name: 'Save', exact: true }).click()
  await worktree.getByText('renamed.md', { exact: true }).waitFor()
  const renamedActions = worktree.getByRole('button', { name: 'More actions for renamed.md', exact: true })
  await renamedActions.click()
  await page.getByRole('menuitem', { name: 'Add path to input', exact: true }).waitFor()
  await capture(page, '09-worktree-row-actions.png')
  runtimeAudit.states.worktree = await inspectState(page, {
    panel: "aside[aria-label='Files']",
    conversation: "[class*='_centerCol']",
    toolbarButton: "aside[aria-label='Files'] header button",
    treeRow: "aside[aria-label='Files'] [class*='_row']",
    rowAction: "button[aria-label='More actions for renamed.md']",
    rowActionIcon: "button[aria-label='More actions for renamed.md'] svg",
    menu: "[role='menu']",
    menuItem: "[role='menuitem']",
  })
  runtimeAudit.states.worktree.conversationWidthClosed = conversationClosedBox.width
  await renamedActions.click()
  const closeFiles = worktree.getByRole('button', { name: 'Close file tree', exact: true })
  const worktreeTooltip = page.getByRole('tooltip')
  await hoverUntilVisible(page, closeFiles, worktreeTooltip)
  const tooltipContrast = await worktreeTooltip.evaluate(node => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
  }))
  if (tooltipContrast.background === tooltipContrast.color || tooltipContrast.background === 'rgba(0, 0, 0, 0)') {
    throw new Error('tooltip foreground and background do not have visible contrast')
  }
  await capture(page, '09-worktree-plugin.png')
  await closeFiles.click()
  await sidebarToggleButton.click()
  await page.locator('[data-sidebar-collapsed]').waitFor({ state: 'detached' })
  await page.locator("[data-pilot-workspaces='wide']").waitFor()
  await inspectStableState(page, { sidebar: "[data-pilot-sidebar='root']" })

  // Create one local Session so the merged title/tab header, integrated
  // composer context, and Trajectory-owned export utility all render.
  await rootProject.click()
  const composer = page.locator('textarea').first()
  await composer.fill('你好')
  await composer.press('Enter')
  await page.getByText('Pilot Harness mock response', { exact: true }).last().waitFor({ timeout: 15_000 })
  const chatTab = page.getByRole('tab', { name: 'Chat', exact: true })
  await chatTab.waitFor({ timeout: 15_000 })
  const conversationHeader = page.locator('[data-pilot-conversation-header]')
  const headerBox = await conversationHeader.boundingBox()
  const chatTabBox = await chatTab.boundingBox()
  if (headerBox === null || chatTabBox === null || chatTabBox.x < headerBox.x || chatTabBox.x > headerBox.x + headerBox.width) {
    throw new Error('conversation title and view tabs are not in one header row')
  }
  if (headerBox.width > 962) throw new Error('conversation header exceeds its max-width contract')
  const headerBorder = await conversationHeader.evaluate(node => getComputedStyle(node.closest('header')).borderBottomWidth)
  if (headerBorder !== '0px') throw new Error('conversation header still renders a divider under the tabs')
  runtimeAudit.states.conversationTabs = await inspectState(page, {
    group: '[data-pilot-conversation-tabs]',
    active: '[data-pilot-conversation-tab][data-state="active"]',
    inactive: '[data-pilot-conversation-tab][data-state="inactive"]',
  })
  const conversationTabStyles = runtimeAudit.states.conversationTabs.elements
  if (conversationTabStyles.group?.borderRadius !== '14px'
    || conversationTabStyles.group?.background === 'rgba(0, 0, 0, 0)'
    || conversationTabStyles.active?.borderRadius !== '8px'
    || Math.abs((conversationTabStyles.active?.box?.height ?? 0) - 30) > 0.5
    || conversationTabStyles.active?.background === conversationTabStyles.group?.background
    || conversationTabStyles.inactive?.background !== 'rgba(0, 0, 0, 0)') {
    throw new Error(`conversation view switch has ambiguous or off-token styling: ${JSON.stringify(conversationTabStyles)}`)
  }
  if (await conversationHeader.getByRole('button', { name: /export log/i }).count() !== 0) {
    throw new Error('per-session log export must not render in the conversation header')
  }
  const headerFiles = conversationHeader.getByRole('button', { name: 'Files', exact: true })
  await headerFiles.waitFor()
  const headerFilesBox = await headerFiles.boundingBox()
  if (headerFilesBox === null || chatTabBox === null || headerFilesBox.x <= chatTabBox.x) {
    throw new Error('Files is not positioned beside the conversation view tabs')
  }
  if (await page.locator('[data-pilot-composer-context]').count() !== 0) {
    throw new Error('a secondary composer information strip still renders below the input card')
  }
  const contextTrigger = page.locator('[data-beautifului="context-trigger"]')
  await contextTrigger.click()
  const contextCard = page.locator('[data-beautifului="context-card"]')
  await contextCard.waitFor()
  if (await contextCard.locator('[data-beautifului="context-stats"]').count() === 0) {
    throw new Error('conversation statistics are not integrated into the Context card')
  }
  await capture(page, '10-chat-context.png')
  await contextTrigger.click()

  const thinking = page.locator('[data-beautifului="thinking"]').last()
  await thinking.getByText('Think', { exact: true }).click()
  const thinkingBody = thinking.getByText(/Inspect the request context/)
  await thinkingBody.waitFor()
  // Let the disclosure's 140ms hover transition settle before measuring the
  // persistent open state; the transient hover blend is intentionally richer.
  await page.mouse.move(chatWidth - 40, Math.floor(settingsHeight / 2))
  await page.waitForTimeout(200)
  await capture(page, '10b-thinking-integrated.png')
  runtimeAudit.states.thinking = await inspectState(page, {
    disclosure: '[data-beautifului="thinking"] [data-open="true"]',
    row: '[data-beautifului="thinking"] [data-open="true"] [role="button"]',
    body: '[data-beautifului="thinking"] [data-open="true"] > div:last-child',
  })
  const thinkingDisclosure = runtimeAudit.states.thinking.elements.disclosure
  const thinkingRowStyle = runtimeAudit.states.thinking.elements.row
  const thinkingBodyStyle = runtimeAudit.states.thinking.elements.body
  if (thinkingDisclosure === null || thinkingDisclosure?.background === 'rgba(0, 0, 0, 0)') {
    throw new Error('expanded Thinking does not render as one integrated filled surface')
  }
  if (thinkingRowStyle === null || thinkingRowStyle?.borderWidth !== '0px' || thinkingRowStyle?.background !== 'rgba(0, 0, 0, 0)') {
    throw new Error('expanded Thinking heading still renders as a separate card')
  }
  if (thinkingBodyStyle === null || thinkingBodyStyle?.borderWidth !== '0px' || thinkingBodyStyle?.background !== 'rgba(0, 0, 0, 0)') {
    throw new Error('expanded Thinking body still renders as a separate outlined card')
  }

  const trajectoryTab = page.getByRole('tab', { name: 'Trajectory', exact: true })
  await trajectoryTab.click()
  if (await trajectoryTab.getAttribute('data-state') !== 'active'
    || await chatTab.getAttribute('data-state') !== 'inactive') {
    throw new Error('conversation view switch did not move its visual selected state to Trajectory')
  }
  try {
    await page.getByRole('searchbox', { name: 'Search trajectory', exact: true }).waitFor({ timeout: 15_000 })
  } catch (error) {
    await capture(page, '11-trajectory-failure.png')
    throw new Error(`Trajectory did not render: ${JSON.stringify({ pageErrors, pageWarnings })}\n${String(error)}`)
  }
  await page.getByRole('button', { name: 'Export log', exact: true }).waitFor()
  await capture(page, '11-trajectory-log.png')
  runtimeAudit.states.trajectory = await inspectState(page, {
    header: '[data-pilot-conversation-header]',
    toolbar: "[role='toolbar'] > [class*='_inner']",
    ledger: "[class*='_ledger']",
    timeline: "section[aria-label='Trajectory timeline']",
  })
  for (const surface of ['toolbar', 'ledger', 'timeline']) {
    if (runtimeAudit.states.trajectory.elements[surface]?.borderWidth !== '0px') {
      throw new Error(`Trajectory ${surface} still uses an outer outline instead of a filled surface`)
    }
  }
  runtimeAudit.pageErrors = pageErrors
  if (pageErrors.length > 0) throw new Error(`desktop renderer errors:\n${pageErrors.join('\n')}`)
} finally {
  runtimeAudit.pageErrors = pageErrors
  runtimeAudit.pageWarnings = pageWarnings
  await persistRuntimeAudit()
  await electronApp.close()
  await mockLlm.close()
  await rm(testHome, { recursive: true, force: true })
}
