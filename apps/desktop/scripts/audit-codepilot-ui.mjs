import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(appRoot, '../..')
const referenceRoot = resolve(
  process.env.CODEPILOT_REFERENCE_ROOT ?? '/Users/op7418/Documents/code/opus-4.6-test',
)
const runtimeOnly = process.argv.includes('--runtime-only')

function argument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function source(root, path) {
  return readFile(resolve(root, path), 'utf8')
}

function includesAll(text, needles) {
  return needles.every(needle => text.includes(needle))
}

function check(category, id, label, passed, evidence) {
  return { category, id, label, passed, evidence }
}

function near(actual, expected, tolerance = 0.5) {
  return typeof actual === 'number' && typeof expected === 'number' && Math.abs(actual - expected) <= tolerance
}

const [
  desktopTheme,
  desktopMain,
  uiPrimitivesPackage,
  conversationRoot,
  conversationSession,
  inputBar,
  markdownStyles,
  tooltipStyles,
  layoutColumns,
  layoutStores,
  semanticIcons,
  sidebarRoot,
  settingsRoot,
  generalStyles,
  workspaceBrowser,
  workspacePicker,
  modelCatalog,
  modelCatalogPackage,
  trajectoryToolbar,
  trajectoryStyles,
  worktreePanel,
  worktreeStyles,
  worktreePackage,
  worktreeReadme,
  desktopPatch,
  cliPackage,
  sessionLogExport,
  referenceGlobals,
  referenceMain,
  referenceIcons,
] = await Promise.all([
  source(repoRoot, 'packages/client/ui-codepilot-theme/src/client/theme.module.css'),
  source(repoRoot, 'apps/desktop/src/main.ts'),
  source(repoRoot, 'packages/client/ui-primitives/package.json'),
  source(repoRoot, 'packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx'),
  source(repoRoot, 'packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx'),
  source(repoRoot, 'packages/client/ui-conversation/src/client/skeleton/InputBar.tsx'),
  source(repoRoot, 'packages/client/ui-primitives/src/markdown/MarkdownText.module.css'),
  source(repoRoot, 'packages/client/ui-primitives/src/Tooltip.module.css'),
  source(repoRoot, 'packages/client/ui-layout/src/client/columns.ts'),
  source(repoRoot, 'packages/client/ui-layout/src/client/stores.ts'),
  source(repoRoot, 'packages/client/ui-primitives/src/CodePilotIcon.tsx').catch(() => ''),
  source(repoRoot, 'packages/client/ui-sidebar/src/client/SidebarRoot.tsx'),
  source(repoRoot, 'packages/client/ui-settings-general/src/client/SettingsRoot.tsx'),
  source(repoRoot, 'packages/client/ui-settings-general/src/client/GeneralSection.module.css'),
  source(repoRoot, 'packages/client/ui-workspace/src/client/WorkspaceBrowser.tsx'),
  source(repoRoot, 'packages/client/ui-workspace/src/client/WorkspacePicker.tsx'),
  source(repoRoot, 'packages/client/ui-settings-models/src/client/ModelCatalogSection.tsx'),
  source(repoRoot, 'packages/client/ui-settings-models/package.json'),
  source(repoRoot, 'packages/client/ui-trajectory/src/client/TrajectoryToolbar.tsx'),
  source(repoRoot, 'packages/client/ui-trajectory/src/client/TrajectoryToolbar.module.css'),
  source(repoRoot, 'packages/workspace/ui-worktree/src/client/WorktreePanel.tsx'),
  source(repoRoot, 'packages/workspace/ui-worktree/src/client/WorktreePanel.module.css'),
  source(repoRoot, 'packages/workspace/ui-worktree/package.json'),
  source(repoRoot, 'packages/workspace/ui-worktree/README.md'),
  source(repoRoot, 'apps/desktop/assets/pilot-harness.patch.yml'),
  source(repoRoot, 'apps/cli/package.json'),
  source(repoRoot, 'packages/session-query/session-log-export/src/client/index.ts'),
  source(referenceRoot, 'src/app/globals.css').catch(() => ''),
  source(referenceRoot, 'electron/main.ts').catch(() => ''),
  source(referenceRoot, 'src/components/ui/semantic-icon.tsx').catch(() => ''),
])

const referenceAnchors = {
  radius: referenceGlobals.includes('--radius: 1rem;'),
  composerShadow: referenceGlobals.includes('--shadow-diffuse:'),
  platformTokens: referenceGlobals.includes('--platform-traffic-light-safe-area:'),
  macTrafficLights: referenceMain.includes("trafficLightPosition = { x: 20, y: 21 }") || referenceMain.includes("trafficLightPosition: { x: 20, y: 21 }") ,
  macVibrancy: referenceMain.includes("'under-window'"),
  windowsOverlay: includesAll(referenceMain, ["titleBarStyle = 'hidden'", 'height: 44']),
  semanticIcons: includesAll(referenceIcons, ['@hugeicons/react', '@hugeicons/core-free-icons', 'SEMANTIC_MAP']),
}

const workspaceRows = await source(repoRoot, 'packages/client/ui-workspace/src/client/rows/Rows.tsx')

const [themePackage, themeClient, conversationApply, conversationStyles, contextMeter, providerCatalog, providerBrand, worktreeClient] = await Promise.all([
  source(repoRoot, 'packages/client/ui-codepilot-theme/package.json'),
  source(repoRoot, 'packages/client/ui-codepilot-theme/src/client/index.ts'),
  source(repoRoot, 'packages/client/ui-conversation/src/client/apply.ts'),
  source(repoRoot, 'packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css'),
  source(repoRoot, 'packages/client/ui-conversation/src/client/skeleton/ContextMeter.tsx'),
  source(repoRoot, 'packages/client/ui-settings-models/src/client/CodePilotProviderCatalog.ts'),
  source(repoRoot, 'packages/client/ui-settings-models/src/client/ProviderBrandIcon.tsx'),
  source(repoRoot, 'packages/workspace/ui-worktree/src/client/index.ts'),
])

const checks = [
  check('tokens', 'radius-base', '基础容器圆角统一为 14px', desktopTheme.includes('--pilot-radius-base: 14px;'), '--pilot-radius-base'),
  check('tokens', 'radius-scale', '圆角收敛为 8px 控件 / 14px 容器两级', includesAll(desktopTheme, ['--pilot-radius-sm: 8px;', '--pilot-radius-md: 8px;', '--pilot-radius-lg: 14px;', '--pilot-nav-radius: 8px;', '--pilot-card-radius: 14px;', '--pilot-input-radius: 8px;']) && !desktopTheme.includes('border-radius: 999px;'), 'theme radius tokens'),
  check('tokens', 'text-scale', '主/次/弱化/说明文字统一映射到四级语义 Token', includesAll(desktopTheme, ['--pilot-text-primary:', '--pilot-text-secondary:', '--pilot-text-muted:', '--pilot-text-caption:', '--dsw-alias-label-secondary: var(--pilot-text-secondary);']), 'text token mapping'),
  check('tokens', 'background', '背景 token 使用 CodePilot OKLCH 值', desktopTheme.includes('--pilot-background: oklch(1 0 0);'), '--pilot-background'),
  check('tokens', 'foreground', '前景 token 使用 CodePilot OKLCH 值', desktopTheme.includes('--pilot-foreground: oklch(0.147 0.004 49.25);'), '--pilot-foreground'),
  check('tokens', 'card-popover', '卡片与浮层 token 对齐', includesAll(desktopTheme, ['--pilot-card: oklch(1 0 0);', '--pilot-popover: oklch(1 0 0);']), 'card/popover'),
  check('tokens', 'primary', '主色 token 对齐', desktopTheme.includes('--pilot-primary: oklch(0.262 0 0);'), '--pilot-primary'),
  check('tokens', 'secondary-muted', '次级与弱化表面 token 对齐', includesAll(desktopTheme, ['--pilot-secondary: oklch(0.95 0.002 106.424);', '--pilot-muted: oklch(0.95 0.002 106.424);']), 'secondary/muted'),
  check('tokens', 'border-input', '边框与输入 token 对齐', includesAll(desktopTheme, ['--pilot-border: oklch(0.923 0.003 48.717);', '--pilot-input: oklch(0.923 0.003 48.717);']), 'border/input'),
  check('tokens', 'sidebar', '侧栏 token 对齐', desktopTheme.includes('--pilot-sidebar: oklch(0.985 0.001 106.423);'), '--pilot-sidebar'),
  check('tokens', 'focus-ring', '焦点环 token 对齐', desktopTheme.includes('--pilot-ring: oklch(0.262 0 0);'), '--pilot-ring'),
  check('tokens', 'diffuse-shadow', '输入区使用 CodePilot diffuse shadow', desktopTheme.includes('--pilot-shadow-diffuse:') && referenceAnchors.composerShadow, '--pilot-shadow-diffuse'),
  check('tokens', 'platform-surfaces', '窗口/侧栏/浮层使用平台表面 token', includesAll(desktopTheme, ['--pilot-platform-surface-window:', '--pilot-platform-surface-sidebar:', '--pilot-platform-surface-popover:']) && referenceAnchors.platformTokens, 'platform surface tokens'),
  check('tokens', 'platform-font', 'macOS UI 字体栈单独适配', desktopTheme.includes('--pilot-platform-font-ui: -apple-system'), 'platform font'),
  check('tokens', 'dark-parity', '深色模式具有同构 CodePilot token', includesAll(desktopTheme, ["body[data-ds-dark-theme]", '--pilot-background: oklch(0.147 0.004 49.25);', '--pilot-primary: oklch(0.985 0.001 106.423);']), 'dark token block'),

  check('components', 'composer-position', 'Token/缓存/性能统计全部进入上下文浮层', contextMeter.includes('<StatsLine') && contextMeter.includes('display="context"') && !conversationApply.includes("id: 'stats'"), 'ContextMeter + conversation apply'),
  check('components', 'composer-radius', '输入框使用统一 14px 容器圆角', desktopTheme.includes('--pilot-composer-radius: 14px;') && desktopTheme.includes('border-radius: var(--pilot-composer-radius);'), 'composer radius'),
  check('components', 'nav-radius', '导航行使用统一 8px 控件圆角', desktopTheme.includes('--pilot-nav-radius: 8px;') && desktopTheme.includes('border-radius: var(--pilot-nav-radius);'), 'nav radius'),
  check('components', 'input-radius', '搜索/选择输入使用统一 8px 控件圆角', desktopTheme.includes('--pilot-input-radius: 8px;') && desktopTheme.includes('border-radius: var(--pilot-input-radius);'), 'input radius'),
  check('components', 'menu-radius', '菜单使用 14px、菜单项使用 8px', includesAll(desktopTheme, ['--pilot-menu-radius: 14px;', '--pilot-menu-item-radius: 8px;', 'border-radius: var(--pilot-menu-radius);', 'border-radius: var(--pilot-menu-item-radius);']), 'menu geometry'),
  check('components', 'popover-motion', '展开层具备 CodePilot 的淡入/缩放动效', includesAll(desktopTheme, ['@keyframes pilot-popover-in', "[data-state='open']", 'animation: pilot-popover-in']), 'popover open state'),
  check('components', 'hover-open', 'Hover、active、expanded 状态完整', includesAll(desktopTheme, [':hover:not(:disabled)', "[aria-expanded='true']", "[data-state='open']"]), 'interactive state selectors'),
  check('components', 'sidebar-shell', '侧栏实际默认宽度与表面对齐', includesAll(desktopTheme, ['--pilot-sidebar-width: 240px;', 'var(--pilot-platform-surface-sidebar)']) && layoutColumns.includes('SIDEBAR_MIN = 240') && layoutStores.includes('PILOT_SIDEBAR_DEFAULT = 240'), 'sidebar surface + desktop layout default'),
  check('components', 'project-rows', '项目与会话行复用导航圆角/hover', includesAll(desktopTheme, ['[data-pilot-workspace-row]', 'var(--pilot-nav-radius)']) && includesAll(workspaceRows, ['data-pilot-workspace-row="project"', 'data-pilot-workspace-row="session"']), 'shared stable workspace-row hook'),
  check('components', 'settings-shell', '设置页为完整桌面工作区，红绿灯区与侧栏使用连续灰色材质', includesAll(desktopTheme, ["[data-pilot-settings='overlay']", 'width: 100%;', 'height: 100%;', 'border-radius: 0;', "[data-pilot-settings='nav']", 'background: var(--pilot-platform-surface-sidebar);']), 'stable settings shell hooks'),
  check('components', 'settings-layout', '设置内容使用与 CodePilot 一致的居中内容宽度', includesAll(desktopTheme, ['--pilot-settings-content-width: 1040px;', 'max-width: var(--pilot-settings-content-width);']), 'settings content width'),
  check('components', 'general-card', '通用设置使用 820px 居中的 14px 卡片', includesAll(generalStyles, ['max-width: 820px;', 'border-radius: 14px;', 'var(--dsw-shadow-lv1)']), 'GeneralSection card'),
  check('components', 'markdown', 'Markdown 标题、列表、引用、代码与表格使用 CodePilot 层级', includesAll(markdownStyles, ['.markdown h1', '.markdown blockquote', '.markdown :not(pre) > code', '.tableScroll', 'border-radius: 14px;']), 'MarkdownText.module.css'),
  check('components', 'tooltip-contrast', 'Tooltip 使用深底白字并保留 reduced-motion', includesAll(tooltipStyles, ['background: #252525;', 'color: #fff;', '@media (prefers-reduced-motion: reduce)']), 'Tooltip.module.css'),
  check('components', 'trajectory-chrome', '轨迹工具栏使用统一卡片、搜索与语义图标', includesAll(trajectoryStyles, ['border-radius: 14px;', '.search:focus-within']) && trajectoryToolbar.includes('CodePilotIcon') && !includesAll(trajectoryToolbar, ['⊞', '⊟']), 'Trajectory toolbar'),
  check('components', 'worktree-chrome', '文件树使用标题栏入口、右侧 Dock 与安全操作工具栏', includesAll(worktreePanel, ['<aside', 'fileCount', "'create-file'", "'rename'"]) && worktreeClient.includes("shell.right-sidebar") && !worktreeClient.includes('shell.overlay') && includesAll(worktreeStyles, ['height: 100%;', 'border-left: 1px solid', 'border-radius: 0;', 'box-shadow: none;']) && !worktreeStyles.includes('position: absolute;'), 'WorktreePanel + shell.right-sidebar'),
  check('components', 'worktree-row-menu', '文件与文件夹统一使用三点菜单承载打开、插入路径与重命名', includesAll(worktreePanel, ['<Menu', 'name="more"', "'action.openFile'", "'action.openFolder'", "'action.addToInput'", "'action.rename'"]) && includesAll(worktreeClient, ['ctx.workspaces.openPath', 'appendWorktreePath', "actx.get('conversation')"]), 'WorktreePanel Menu + scoped client actions'),
  check('components', 'model-toolbar', '模型页搜索与筛选控件对齐', includesAll(desktopTheme, ['[data-pilot-model-search]', '[data-pilot-model-filters]', 'var(--pilot-input-radius)']), 'stable model toolbar hooks'),
  check('components', 'model-rows', '模型分组与行使用 CodePilot 卡片层级', includesAll(desktopTheme, ['[data-pilot-model-group]', '[data-pilot-model-row]', '--pilot-card-radius: 14px;']), 'stable model list hooks'),
  check('components', 'file-header-toggle', 'Files 插件入口位于对话/轨迹页签旁', worktreeClient.includes("conversation.session.header.utilities") && worktreeClient.includes('WorktreeHeaderToggle'), 'ui-worktree client slots'),
  check('components', 'header-divider', '会话页签下方不再绘制分割线', conversationStyles.includes('border-bottom: none;'), 'ConversationRoot.module.css'),
  check('components', 'conversation-tabs', '对话/轨迹切换使用 14px 色块容器、8px 控件和稳定主题契约', includesAll(desktopTheme, ['[data-pilot-conversation-tabs]', '[data-pilot-conversation-tab]', 'background: var(--pilot-muted);', "[data-state='active']", 'background: var(--pilot-card);']) && includesAll(conversationSession, ['data-pilot-conversation-tabs', 'data-pilot-conversation-tab={viewTab.id}', "data-state={viewTab.id === active?.id ? 'active' : 'inactive'}"]), 'stable conversation tab hooks + theme tokens'),
  check('components', 'provider-cards', '服务商卡片与操作按钮使用统一组件 token', includesAll(desktopTheme, ['[data-pilot-provider-card]', '[data-pilot-settings-button]', 'var(--pilot-card-radius)']), 'stable provider card hooks'),
  check('components', 'stable-theme-hooks', '主题适配不依赖 CSS Modules 生成类名', !desktopTheme.includes("[class*='_") && !desktopTheme.includes('[class*="_'), '0 CSS Modules hash selectors'),
  check('components', 'focus-visible', '键盘焦点使用高对比语义 outline 与柔和外环', includesAll(desktopTheme, [':focus-visible', 'outline: 2px solid', 'outline-offset: 2px', 'var(--pilot-ring)']), 'focus visible'),
  check('components', 'reduced-motion', '减少动态效果偏好受支持', desktopTheme.includes('@media (prefers-reduced-motion: reduce)'), 'reduced motion'),

  check('icons', 'same-dependencies', '使用 CodePilot 的 HugeIcons 语义图标依赖', includesAll(uiPrimitivesPackage, ['@hugeicons/core-free-icons', '@hugeicons/react']) && referenceAnchors.semanticIcons, 'ui-primitives package dependencies'),
  check('icons', 'semantic-layer', '具备统一 CodePilotIcon 语义映射层', includesAll(semanticIcons, ['HugeiconsIcon', 'SEMANTIC_MAP', 'CodePilotIconName']), 'CodePilotIcon.tsx'),
  check('icons', 'sidebar-icons', '侧栏核心图标迁到语义层', sidebarRoot.includes('CodePilotIcon') && !sidebarRoot.includes('IconNewChatOutline16'), 'SidebarRoot.tsx'),
  check('icons', 'settings-icons', '设置导航图标迁到语义层', settingsRoot.includes('CodePilotIcon') && !settingsRoot.includes('IconSettingsOutline16'), 'SettingsRoot.tsx'),
  check('icons', 'workspace-icons', '项目区核心图标迁到语义层', workspaceBrowser.includes('CodePilotIcon') && workspacePicker.includes('CodePilotIcon'), 'WorkspaceBrowser/Picker'),
  check('icons', 'model-icons', '模型页图标迁到语义层', modelCatalog.includes('CodePilotIcon') && !modelCatalog.includes('IconDataOutline16'), 'ModelCatalogSection.tsx'),
  check('icons', 'provider-brand-icons', 'CodePilot 服务商使用同源品牌图标库并覆盖国内外目录', modelCatalogPackage.includes('@lobehub/icons') && includesAll(providerBrand, ['Zhipu', 'Kimi', 'Minimax', 'Moonshot', 'Bailian', 'XiaomiMiMo', 'XAI', 'Bedrock']), 'ProviderBrandIcon.tsx'),
  check('icons', 'trajectory-icons', '轨迹控制不再使用文本符号或手绘 SVG', trajectoryToolbar.includes('CodePilotIcon') && !trajectoryToolbar.includes('<svg') && !trajectoryToolbar.includes('⊞') && !trajectoryToolbar.includes('⊟'), 'TrajectoryToolbar.tsx'),

  check('plugins', 'worktree-dual-face', '文件树是标准 Host + Client 双面插件', includesAll(worktreePackage, ['"@deepseek-ai/dsh-ui-worktree"', '"./client"', '"platform": "web"']) && !worktreePanel.includes('electron'), 'ui-worktree package'),
  check('plugins', 'worktree-vanilla-install', '具备所需公开 Slot 的 Harness 可用相同 Cordis 插件行安装', includesAll(worktreeReadme, ["name: '@deepseek-ai/dsh-ui-worktree'", '`shell.right-sidebar`', '`conversation.session.header.utilities`', '`sidebar.workspaces.session.detail`']), 'ui-worktree README compatibility contract'),
  check('plugins', 'desktop-bare-plugin', '桌面补丁使用可升级的包名而非绝对路径', desktopPatch.includes("name: '@deepseek-ai/dsh-ui-worktree'") && !desktopPatch.includes('__PILOT_WORKTREE_ENTRY__'), 'desktop patch'),
  check('plugins', 'runtime-closure', 'CLI 发布闭包携带文件树插件供 profile 解析', cliPackage.includes('"@deepseek-ai/dsh-ui-worktree": "workspace:^"'), 'apps/cli dependency'),
  check('plugins', 'trajectory-export-slot', '单会话日志导出由插件注册到轨迹 toolbar slot', sessionLogExport.includes("ctx.slots.inject('conversation.trajectory.toolbar'"), 'session-log-export client'),
  check('plugins', 'model-provider-plugin', '桌面模型插件保持空目录启动，不注入 Anthropic 假默认', desktopPatch.includes('- id: llm-pi-ai') && !desktopPatch.includes('anthropic: {}') && !desktopPatch.includes('provider: anthropic'), 'desktop model patch'),
  check('plugins', 'theme-client-plugin', 'CodePilot 主题由可卸载 Client 插件拥有', includesAll(themePackage, ['@deepseek-ai/dsh-client-ui-codepilot-theme', '"platform": "web"']) && themeClient.includes('data-codepilot-theme') && desktopPatch.includes("name: '@deepseek-ai/dsh-client-ui-codepilot-theme'") && !desktopMain.includes('insertCSS'), 'theme package + desktop patch'),
  check('plugins', 'curated-provider-catalog', 'Azure、Anthropic 等非 CodePilot 目录不会进入新增服务商选择器', includesAll(providerCatalog, ["'azure-openai-responses'", "'anthropic'", 'EXCLUDED_PI_AI_PROVIDERS']), 'CodePilotProviderCatalog.ts'),

  check('platform', 'mac-titlebar', 'macOS 使用 hiddenInset', desktopMain.includes("titleBarStyle: 'hiddenInset'"), 'BrowserWindow titleBarStyle'),
  check('platform', 'mac-traffic-lights', 'macOS 红绿灯位置为 CodePilot 20/21', desktopMain.includes('trafficLightPosition: { x: 20, y: 21 }') && referenceAnchors.macTrafficLights, 'trafficLightPosition'),
  check('platform', 'mac-vibrancy', 'macOS 使用 under-window vibrancy', desktopMain.includes("vibrancy: 'under-window'") && referenceAnchors.macVibrancy, 'vibrancy'),
  check('platform', 'mac-transparent', 'macOS 使用透明原生窗口背板', includesAll(desktopMain, ["'#00ffffff'", 'transparent: true']), 'transparent BrowserWindow'),
  check('platform', 'mac-effect-state', 'macOS 原生材质跟随窗口状态', desktopMain.includes("visualEffectState: 'followWindow'"), 'visualEffectState'),
  check('platform', 'windows-overlay', 'Windows 使用 44px 透明标题栏叠层', includesAll(desktopMain, ["color: '#00000000'", 'height: 44']) && referenceAnchors.windowsOverlay, 'titleBarOverlay'),
  check('platform', 'integrated-topbar', 'macOS 内容与窗口栏融合并保留 8px 可拖动命中带', desktopTheme.includes("[data-pilot-platform='darwin'] body {\n  padding-top: 0;") && includesAll(desktopTheme, ['html[data-codepilot-theme][data-pilot-desktop] body::before', 'height: 8px;', '-webkit-app-region: drag;']), 'desktop top area'),
  check('platform', 'windows-safe-area', 'Windows 标题栏安全区不遮挡内容', includesAll(desktopTheme, ["[data-pilot-platform='win32'] body", 'padding-top: 44px;']), 'Windows safe area'),
]

if (runtimeOnly) checks.length = 0

const runtimeArgument = argument('--runtime')
if (runtimeOnly && runtimeArgument === undefined) {
  throw new Error('--runtime-only requires --runtime <audit.json>')
}
if (runtimeArgument !== undefined) {
  const runtime = JSON.parse(await source(repoRoot, runtimeArgument))
  const chat = runtime.states?.chat
  const collapsedSidebar = runtime.states?.collapsedSidebar
  const workspaceChip = runtime.states?.workspaceChip
  const providers = runtime.states?.providers
  const models = runtime.states?.models
  const conversationTabs = runtime.states?.conversationTabs
  const railControlKeys = ['sidebarToggle', 'chatControl', 'workspaceControl', 'searchControl']
  const railIconPairs = [
    ['chatControl', 'chatIcon'],
    ['workspaceControl', 'workspaceIcon'],
    ['searchControl', 'searchIcon'],
  ]
  const centerX = element => element?.box?.x + element?.box?.width / 2
  const collapsedRailAligned = railControlKeys.every(key => (
    near(collapsedSidebar?.elements?.[key]?.box?.width, 36)
      && near(collapsedSidebar?.elements?.[key]?.box?.height, 36)
      && collapsedSidebar?.elements?.[key]?.borderRadius === '8px'
  )) && ['chatIcon', 'workspaceIcon', 'searchIcon'].every(key => (
    near(collapsedSidebar?.elements?.[key]?.box?.width, 16)
      && near(collapsedSidebar?.elements?.[key]?.box?.height, 16)
  )) && railIconPairs.every(([controlKey, iconKey]) => (
    Math.abs(centerX(collapsedSidebar?.elements?.[controlKey])
      - centerX(collapsedSidebar?.elements?.[iconKey])) <= 1
  )) && Math.abs(centerX(collapsedSidebar?.elements?.sidebarToggle)
    - centerX(collapsedSidebar?.elements?.chatControl)) <= 1
    && near(collapsedSidebar?.elements?.workspaceControl?.box?.y
      - (collapsedSidebar?.elements?.chatControl?.box?.y
        + collapsedSidebar?.elements?.chatControl?.box?.height), 4)
    && near(collapsedSidebar?.elements?.searchControl?.box?.y
      - (collapsedSidebar?.elements?.workspaceControl?.box?.y
        + collapsedSidebar?.elements?.workspaceControl?.box?.height), 4)
  const expectedChatViewport = runtime.expected?.chatViewport
  const expectedSettingsViewport = runtime.expected?.settingsViewport
  const runtimeChecks = [
    check('runtime', 'chat-viewport', '聊天审计使用请求的同尺寸视口', chat?.viewport?.width === expectedChatViewport?.width && chat?.viewport?.height === expectedChatViewport?.height, JSON.stringify({ actual: chat?.viewport, expected: expectedChatViewport })),
    check('runtime', 'mac-body-inset', 'macOS 实际内容无伪标题栏上内边距', chat?.body?.paddingTop === '0px', String(chat?.body?.paddingTop)),
    check('runtime', 'window-drag-strip', '窗口顶部与可见侧栏标题行均可拖动', chat?.body?.dragStrip === 'drag' && chat?.elements?.titlebar?.appRegion === 'drag', JSON.stringify({ body: chat?.body?.dragStrip, titlebar: chat?.elements?.titlebar?.appRegion })),
    check('runtime', 'sidebar-width', '侧栏实际渲染宽度为 240px', near(chat?.elements?.sidebar?.box?.width, 240), `${String(chat?.elements?.sidebar?.box?.width)}px`),
    check('runtime', 'composer-geometry', '输入区不超过 768px 上限并保持 14px 圆角', Number(chat?.elements?.composer?.box?.width) > 0 && Number(chat?.elements?.composer?.box?.width) <= 768.5 && chat?.elements?.composer?.borderRadius === '14px', JSON.stringify(chat?.elements?.composer)),
    check('runtime', 'composer-shadow', '输入区实际应用语义浮层阴影', String(chat?.elements?.composer?.boxShadow) !== 'none', String(chat?.elements?.composer?.boxShadow)),
    check('runtime', 'project-radius', '项目行实际应用 8px 圆角', chat?.elements?.projectRow?.borderRadius === '8px', String(chat?.elements?.projectRow?.borderRadius)),
    check('runtime', 'project-selection', '当前工作区文件夹不使用选中色块，选中态只属于会话行', chat?.elements?.projectRow?.background === 'rgba(0, 0, 0, 0)', String(chat?.elements?.projectRow?.background)),
    check('runtime', 'collapsed-rail-rhythm', '折叠侧栏品牌、对话、工作区与搜索按钮统一为 36px/8px，并共用一条水平中心线；操作图标保持 16px 与 4px 间距', collapsedRailAligned, JSON.stringify(collapsedSidebar?.elements)),
    check('runtime', 'workspace-chip-rhythm', '工作区选择器使用 14px 图标、28px 控件与 6px 图文间距，文字无嵌套内边距并保持垂直居中', near(workspaceChip?.elements?.control?.box?.height, 28) && near(workspaceChip?.elements?.icon?.box?.width, 14) && near(workspaceChip?.elements?.icon?.box?.height, 14) && workspaceChip?.elements?.label?.padding === '0px' && near(workspaceChip?.elements?.label?.box?.height, 20) && Math.abs((workspaceChip?.elements?.icon?.box?.y + workspaceChip?.elements?.icon?.box?.height / 2) - (workspaceChip?.elements?.label?.box?.y + workspaceChip?.elements?.label?.box?.height / 2)) <= 1 && near(workspaceChip?.elements?.label?.box?.x - (workspaceChip?.elements?.icon?.box?.x + workspaceChip?.elements?.icon?.box?.width), 6) && near(workspaceChip?.elements?.chevron?.box?.x - (workspaceChip?.elements?.label?.box?.x + workspaceChip?.elements?.label?.box?.width), 6), JSON.stringify(workspaceChip?.elements)),
    check('runtime', 'settings-shell', '设置页实际铺满请求的窗口且无网页弹窗圆角', providers?.viewport?.width === expectedSettingsViewport?.width && providers?.viewport?.height === expectedSettingsViewport?.height && near(providers?.elements?.settingsPanel?.box?.width, expectedSettingsViewport?.width) && providers?.elements?.settingsPanel?.borderRadius === '0px', JSON.stringify({ viewport: providers?.viewport, panel: providers?.elements?.settingsPanel })),
    check('runtime', 'settings-nav', '设置导航为 240px，红绿灯区与导航使用同一块灰色材质', near(providers?.elements?.settingsNav?.box?.width, 240) && providers?.elements?.settingsNav?.padding?.startsWith('48px') && providers?.elements?.settingsNav?.background !== 'rgba(0, 0, 0, 0)' && providers?.elements?.settingsNav?.backgroundImage === 'none', JSON.stringify(providers?.elements?.settingsNav)),
    check('runtime', 'provider-action', '服务商入口实际使用 8px 控件圆角', providers?.elements?.providerAction?.borderRadius === '8px', String(providers?.elements?.providerAction?.borderRadius)),
    check('runtime', 'model-search', '模型搜索实际应用 8px 圆角', models?.elements?.modelSearch?.borderRadius === '8px', String(models?.elements?.modelSearch?.borderRadius)),
    check('runtime', 'model-card', '模型服务商卡片实际应用 14px 圆角', models?.elements?.modelGroup?.borderRadius === '14px', String(models?.elements?.modelGroup?.borderRadius)),
    check('runtime', 'model-row-density', '模型行实际压缩到 50px 以内', Number(models?.elements?.modelRow?.box?.height) <= 50, `${String(models?.elements?.modelRow?.box?.height)}px`),
    check('runtime', 'thinking-surface', 'Thinking 展开态为单一色块，标题与正文都不再拥有独立描边或底色', runtime.states?.thinking?.elements?.disclosure?.background !== 'rgba(0, 0, 0, 0)' && runtime.states?.thinking?.elements?.row?.borderWidth === '0px' && runtime.states?.thinking?.elements?.row?.background === 'rgba(0, 0, 0, 0)' && runtime.states?.thinking?.elements?.body?.borderWidth === '0px' && runtime.states?.thinking?.elements?.body?.background === 'rgba(0, 0, 0, 0)', JSON.stringify(runtime.states?.thinking?.elements)),
    check('runtime', 'general-card', '通用设置卡片不超过 820px 上限、保持 14px 并在内容列居中', Number(runtime.states?.general?.elements?.generalCard?.box?.width) > 0 && Number(runtime.states?.general?.elements?.generalCard?.box?.width) <= 820.5 && runtime.states?.general?.elements?.generalCard?.borderRadius === '14px' && Math.abs(centerX(runtime.states?.general?.elements?.generalCard) - centerX(runtime.states?.general?.elements?.settingsOptions)) <= 2, JSON.stringify(runtime.states?.general?.elements)),
    check('runtime', 'worktree-plugin', '文件树作为贴右全高侧栏渲染并挤压对话区', runtime.states?.worktree?.elements?.panel?.box?.width === 320 && Math.abs(runtime.states?.worktree?.elements?.panel?.box?.x + runtime.states?.worktree?.elements?.panel?.box?.width - runtime.states?.worktree?.viewport?.width) <= 1 && runtime.states?.worktree?.elements?.panel?.position === 'static' && runtime.states?.worktree?.elements?.panel?.borderRadius === '0px' && runtime.states?.worktree?.elements?.panel?.boxShadow === 'none' && runtime.states?.worktree?.elements?.conversation?.box?.width < runtime.states?.worktree?.conversationWidthClosed && runtime.states?.worktree?.elements?.toolbarButton?.box?.width === 28 && runtime.states?.worktree?.elements?.treeRow?.borderRadius === '8px', JSON.stringify(runtime.states?.worktree)),
    check('runtime', 'worktree-row-menu', '文件树三点菜单使用 28px 操作区、16px 图标、14px 菜单与 8px 菜单项圆角', runtime.states?.worktree?.elements?.rowAction?.box?.width === 28 && runtime.states?.worktree?.elements?.rowAction?.box?.height === 28 && runtime.states?.worktree?.elements?.rowActionIcon?.box?.width === 16 && runtime.states?.worktree?.elements?.rowActionIcon?.box?.height === 16 && runtime.states?.worktree?.elements?.menu?.borderRadius === '14px' && runtime.states?.worktree?.elements?.menuItem?.borderRadius === '8px', JSON.stringify(runtime.states?.worktree?.elements)),
    check('runtime', 'conversation-tabs', '对话/轨迹切换实际呈现 14px muted 底板、30px/8px 页签和清晰选中态', conversationTabs?.elements?.group?.borderRadius === '14px' && conversationTabs?.elements?.group?.background !== 'rgba(0, 0, 0, 0)' && near(conversationTabs?.elements?.active?.box?.height, 30) && conversationTabs?.elements?.active?.borderRadius === '8px' && conversationTabs?.elements?.active?.background !== conversationTabs?.elements?.group?.background && conversationTabs?.elements?.inactive?.background === 'rgba(0, 0, 0, 0)', JSON.stringify(conversationTabs?.elements)),
    check('runtime', 'trajectory-view', '轨迹 toolbar、时间线与 ledger 使用无外框色块表面', runtime.states?.trajectory?.elements?.toolbar?.borderRadius === '14px' && runtime.states?.trajectory?.elements?.timeline?.borderRadius === '14px' && runtime.states?.trajectory?.elements?.ledger?.borderRadius === '14px' && ['toolbar', 'timeline', 'ledger'].every(key => runtime.states?.trajectory?.elements?.[key]?.borderWidth === '0px'), JSON.stringify(runtime.states?.trajectory?.elements)),
  ]
  checks.push(...runtimeChecks)
}

const categories = [...new Set(checks.map(item => item.category))]
const summary = Object.fromEntries(categories.map(category => {
  const items = checks.filter(item => item.category === category)
  const passed = items.filter(item => item.passed).length
  return [category, { passed, total: items.length, percent: Math.round((passed / items.length) * 100) }]
}))
const totalPassed = checks.filter(item => item.passed).length
const total = checks.length

const result = {
  generatedAt: new Date().toISOString(),
  target: repoRoot,
  reference: referenceRoot,
  referenceAnchors,
  summary: {
    passed: totalPassed,
    total,
    percent: Math.round((totalPassed / total) * 100),
    categories: summary,
  },
  checks,
}

const markdown = [
  '# CodePilot UI 适配覆盖率',
  '',
  `- 总体：${result.summary.passed}/${result.summary.total}（${result.summary.percent}%）`,
  ...categories.map(category => `- ${category}：${summary[category].passed}/${summary[category].total}（${summary[category].percent}%）`),
  '',
  '| 类别 | 检查项 | 状态 | 证据 |',
  '|---|---|---:|---|',
  ...checks.map(item => `| ${item.category} | ${item.label} | ${item.passed ? '通过' : '未完成'} | ${item.evidence} |`),
  '',
  '> 本报告检查的是核心聊天、项目、设置、服务商/模型和桌面窗口壳层，不把尚未进入这些主流程的 Harness 插件页面计入分母。',
  '',
].join('\n')

const output = argument('--output')
if (output !== undefined) {
  const resolved = resolve(repoRoot, output)
  await writeFile(resolved, output.endsWith('.json') ? `${JSON.stringify(result, null, 2)}\n` : markdown)
}

if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
else console.log(markdown)

if (totalPassed !== total) process.exitCode = 1
