import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const source = path => readFile(join(repoRoot, path), 'utf8')
const includesAll = (value, needles) => needles.every(needle => value.includes(needle))

const [
  inputBar,
  inputStyles,
  desktopTheme,
  reasoning,
  reasoningStyles,
  toolRow,
  toolStyles,
  contextMeter,
  contextStyles,
  codeBlock,
  codeStyles,
  searchBlock,
  searchStyles,
  trajectory,
  worktree,
  worktreeStyles,
  semanticIcons,
  adoption,
] = await Promise.all([
  source('packages/client/ui-conversation/src/client/skeleton/InputBar.tsx'),
  source('packages/client/ui-conversation/src/client/skeleton/InputBar.module.css'),
  source('packages/client/ui-codepilot-theme/src/client/theme.module.css'),
  source('packages/client/ui-conversation/src/client/chat/ReasoningRow.tsx'),
  source('packages/client/ui-conversation/src/client/chat/ReasoningRow.module.css'),
  source('packages/client/ui-tool/src/client/tool/components/ToolRow.tsx'),
  source('packages/client/ui-tool/src/client/tool/components/ToolRow.module.css'),
  source('packages/client/ui-conversation/src/client/skeleton/ContextMeter.tsx'),
  source('packages/client/ui-conversation/src/client/skeleton/ContextMeter.module.css'),
  source('packages/client/ui-primitives/src/markdown/CodeBlock.tsx'),
  source('packages/client/ui-primitives/src/markdown/CodeBlock.module.css'),
  source('packages/client/ui-primitives/src/SearchBlock.tsx'),
  source('packages/client/ui-primitives/src/SearchBlock.module.css'),
  source('packages/client/ui-trajectory/src/client/TrajectoryTable.tsx'),
  source('packages/workspace/ui-worktree/src/client/WorktreePanel.tsx'),
  source('packages/workspace/ui-worktree/src/client/WorktreePanel.module.css'),
  source('packages/client/ui-primitives/src/CodePilotIcon.tsx'),
  source('docs/audits/2026-08-16-beautiful-ui-adoption.md'),
])

const checks = []
const check = (category, id, label, pass, evidence) => {
  checks.push({ category, id, label, pass, evidence })
}

check('components', 'prompt-bar', 'Prompt Bar primitive is mounted on the real composer',
  inputBar.includes('data-beautifului="prompt-bar"'), 'InputBar.tsx')
check('components', 'prompt-bar-geometry', 'Prompt Bar uses compact 14px geometry and focus treatment',
  includesAll(inputStyles, ['border-radius: 14px;', '.card:focus-within', 'width: 28px;', 'height: 28px;'])
    && desktopTheme.includes('--pilot-composer-radius: 14px;'), 'InputBar CSS + desktop theme')
check('components', 'thinking', 'Thinking disclosure uses the Beautiful UI state pattern',
  reasoning.includes('data-beautifului="thinking"')
    && includesAll(reasoningStyles, ['height: 32px;', 'border-radius: 8px;', '.thinkBody']), 'ReasoningRow')
check('components', 'tool-chips', 'Tool calls render as compact filled chips',
  toolRow.includes('data-beautifului="tool-chip"')
    && includesAll(toolStyles, ['height: 30px;', 'border-radius: 8px;', 'font-family: var(--ds-font-family-code)']), 'ToolRow')
check('components', 'context-card', 'Composer context uses a persistent trigger and breakdown card',
  includesAll(contextMeter, ['data-beautifului="context-trigger"', 'data-beautifului="context-card"'])
    && includesAll(contextStyles, ['dsh-context-card-in', 'border-radius: 14px;'])
    && contextMeter.includes('<StatsLine'), 'ContextMeter')
check('components', 'code-block', 'Code block has semantic chrome and line-number rows',
  codeBlock.includes('data-beautifului="code-block"')
    && includesAll(codeStyles, ['counter-reset: dsh-code-line;', 'counter-increment: dsh-code-line;', '.copyButton:hover']), 'CodeBlock')
check('components', 'search', 'Search results use semantic card and group states',
  searchBlock.includes('data-beautifului="search-results"')
    && includesAll(searchStyles, ['.fileHeader:hover', '.copyButton:hover', 'box-shadow: var(--dsw-shadow-lv1)']), 'SearchBlock')
check('components', 'sidebar-nav', 'Worktree uses the compact Sidebar Nav pattern',
  worktree.includes('data-beautifului="sidebar-nav"')
    && includesAll(worktreeStyles, ['width: min(320px', 'height: 100%;', 'border-radius: 0;', 'border-radius: 8px;', 'box-shadow: none;']), 'WorktreePanel')

check('icons', 'semantic-library', 'New controls stay on the shared HugeIcons semantic layer',
  includesAll(semanticIcons, ["| 'copy'", "| 'send'", "| 'stop'", "| 'tool'", 'SparklesIcon']), 'CodePilotIcon.tsx')
check('icons', 'composer-no-inline-svg', 'Composer send/stop controls do not use hand-authored SVG',
  !inputBar.includes('<svg'), 'InputBar.tsx')
check('icons', 'trajectory-no-inline-svg', 'Trajectory ledger does not use hand-authored SVG',
  !trajectory.includes('<svg') && trajectory.includes('<CodePilotIcon'), 'TrajectoryTable.tsx')
check('icons', 'context-no-inline-svg', 'Context trigger does not use a hand-authored ring SVG',
  !contextMeter.includes('<svg') && contextMeter.includes('name="context"'), 'ContextMeter.tsx')

check('compatibility', 'no-demo-runtime', 'Beautiful UI demo runtime and autoplay are not imported',
  ![inputBar, reasoning, toolRow, contextMeter, codeBlock, searchBlock, worktree].some(value => value.includes('from "glimm"') || value.includes("from 'glimm'")), 'adapted sources')
check('compatibility', 'harness-contracts', 'Harness slots and projection contracts remain the state boundary',
  inputBar.includes('ComposerBarProps') && contextMeter.includes("useProjection('contextPressure')")
    && toolRow.includes('ToolRowProps'), 'Harness component contracts')
check('compatibility', 'reduced-motion', 'New animated context surface respects reduced motion',
  contextStyles.includes('@media (prefers-reduced-motion: reduce)'), 'ContextMeter.module.css')
check('license', 'source-note', 'Beautiful UI source and MIT terms are recorded',
  includesAll(adoption, ['https://www.beautifului.dev/', 'MIT License', 'Shane Levine']), 'adoption note')

const categories = Object.fromEntries([...new Set(checks.map(item => item.category))].map((category) => {
  const rows = checks.filter(item => item.category === category)
  const passed = rows.filter(item => item.pass).length
  return [category, { passed, total: rows.length, percent: Math.round(passed / rows.length * 100) }]
}))
const passed = checks.filter(item => item.pass).length
const summary = { passed, total: checks.length, percent: Math.round(passed / checks.length * 100), categories }
const report = { generatedAt: new Date().toISOString(), summary, checks }

const outputIndex = process.argv.indexOf('--out')
if (outputIndex !== -1) {
  const outputDir = resolve(process.argv[outputIndex + 1])
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, 'beautiful-ui-adoption.json'), `${JSON.stringify(report, null, 2)}\n`)
  const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.category} | ${item.label} | ${item.evidence} |`).join('\n')
  await writeFile(join(outputDir, 'beautiful-ui-adoption.md'), [
    '# Beautiful UI adoption audit',
    '',
    `Result: ${summary.passed}/${summary.total} (${summary.percent}%)`,
    '',
    '| Status | Category | Check | Evidence |',
    '| --- | --- | --- | --- |',
    rows,
    '',
  ].join('\n'))
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
if (passed !== checks.length) process.exitCode = 1
