# CodePilot UI 适配覆盖率

- 总体：80/80（100%）
- tokens：15/15（100%）
- components：23/23（100%）
- icons：8/8（100%）
- plugins：8/8（100%）
- platform：8/8（100%）
- runtime：18/18（100%）

| 类别 | 检查项 | 状态 | 证据 |
|---|---|---:|---|
| tokens | 基础容器圆角统一为 14px | 通过 | --pilot-radius-base |
| tokens | 圆角收敛为 8px 控件 / 14px 容器两级 | 通过 | theme radius tokens |
| tokens | 主/次/弱化/说明文字统一映射到四级语义 Token | 通过 | text token mapping |
| tokens | 背景 token 使用 CodePilot OKLCH 值 | 通过 | --pilot-background |
| tokens | 前景 token 使用 CodePilot OKLCH 值 | 通过 | --pilot-foreground |
| tokens | 卡片与浮层 token 对齐 | 通过 | card/popover |
| tokens | 主色 token 对齐 | 通过 | --pilot-primary |
| tokens | 次级与弱化表面 token 对齐 | 通过 | secondary/muted |
| tokens | 边框与输入 token 对齐 | 通过 | border/input |
| tokens | 侧栏 token 对齐 | 通过 | --pilot-sidebar |
| tokens | 焦点环 token 对齐 | 通过 | --pilot-ring |
| tokens | 输入区使用 CodePilot diffuse shadow | 通过 | --pilot-shadow-diffuse |
| tokens | 窗口/侧栏/浮层使用平台表面 token | 通过 | platform surface tokens |
| tokens | macOS UI 字体栈单独适配 | 通过 | platform font |
| tokens | 深色模式具有同构 CodePilot token | 通过 | dark token block |
| components | Token/缓存/性能统计全部进入上下文浮层 | 通过 | ContextMeter + conversation apply |
| components | 输入框使用统一 14px 容器圆角 | 通过 | composer radius |
| components | 导航行使用统一 8px 控件圆角 | 通过 | nav radius |
| components | 搜索/选择输入使用统一 8px 控件圆角 | 通过 | input radius |
| components | 菜单使用 14px、菜单项使用 8px | 通过 | menu geometry |
| components | 展开层具备 CodePilot 的淡入/缩放动效 | 通过 | popover open state |
| components | Hover、active、expanded 状态完整 | 通过 | interactive state selectors |
| components | 侧栏实际默认宽度与表面对齐 | 通过 | sidebar surface + desktop layout default |
| components | 项目与会话行复用导航圆角/hover | 通过 | project/session row selectors |
| components | 设置页为完整桌面工作区而非网页弹窗 | 通过 | settings shell |
| components | 设置内容使用与 CodePilot 一致的居中内容宽度 | 通过 | settings content width |
| components | 通用设置使用 820px 居中的 14px 卡片 | 通过 | GeneralSection card |
| components | Markdown 标题、列表、引用、代码与表格使用 CodePilot 层级 | 通过 | MarkdownText.module.css |
| components | Tooltip 使用深底白字并保留 reduced-motion | 通过 | Tooltip.module.css |
| components | 轨迹工具栏使用统一卡片、搜索与语义图标 | 通过 | Trajectory toolbar |
| components | 文件树使用标题栏入口、色块浮层与安全操作工具栏 | 通过 | WorktreePanel.tsx + client slots |
| components | 模型页搜索与筛选控件对齐 | 通过 | model toolbar |
| components | 模型分组与行使用 CodePilot 卡片层级 | 通过 | model list geometry |
| components | Files 插件入口位于对话/轨迹页签旁 | 通过 | ui-worktree client slots |
| components | 会话页签下方不再绘制分割线 | 通过 | ConversationRoot.module.css |
| components | 服务商卡片与操作按钮使用统一组件 token | 通过 | provider cards |
| components | 键盘焦点为 3px 语义焦点环 | 通过 | focus visible |
| components | 减少动态效果偏好受支持 | 通过 | reduced motion |
| icons | 使用 CodePilot 的 HugeIcons 语义图标依赖 | 通过 | ui-primitives package dependencies |
| icons | 具备统一 CodePilotIcon 语义映射层 | 通过 | CodePilotIcon.tsx |
| icons | 侧栏核心图标迁到语义层 | 通过 | SidebarRoot.tsx |
| icons | 设置导航图标迁到语义层 | 通过 | SettingsRoot.tsx |
| icons | 项目区核心图标迁到语义层 | 通过 | WorkspaceBrowser/Picker |
| icons | 模型页图标迁到语义层 | 通过 | ModelCatalogSection.tsx |
| icons | CodePilot 服务商使用同源品牌图标库并覆盖国内外目录 | 通过 | ProviderBrandIcon.tsx |
| icons | 轨迹控制不再使用文本符号或手绘 SVG | 通过 | TrajectoryToolbar.tsx |
| plugins | 文件树是标准 Host + Client 双面插件 | 通过 | ui-worktree package |
| plugins | 普通 Harness 可用相同 Cordis 插件行安装 | 通过 | ui-worktree README |
| plugins | 桌面补丁使用可升级的包名而非绝对路径 | 通过 | desktop patch |
| plugins | CLI 发布闭包携带文件树插件供 profile 解析 | 通过 | apps/cli dependency |
| plugins | 单会话日志导出由插件注册到轨迹 toolbar slot | 通过 | session-log-export client |
| plugins | 桌面模型插件保持空目录启动，不注入 Anthropic 假默认 | 通过 | desktop model patch |
| plugins | CodePilot 主题由可卸载 Client 插件拥有 | 通过 | theme package + desktop patch |
| plugins | Azure、Anthropic 等非 CodePilot 可用目录不会进入服务商/模型界面 | 通过 | CodePilotProviderCatalog.ts |
| platform | macOS 使用 hiddenInset | 通过 | BrowserWindow titleBarStyle |
| platform | macOS 红绿灯位置为 CodePilot 20/21 | 通过 | trafficLightPosition |
| platform | macOS 使用 under-window vibrancy | 通过 | vibrancy |
| platform | macOS 使用透明原生窗口背板 | 通过 | transparent BrowserWindow |
| platform | macOS 原生材质跟随窗口状态 | 通过 | visualEffectState |
| platform | Windows 使用 44px 透明标题栏叠层 | 通过 | titleBarOverlay |
| platform | macOS 内容与窗口栏融合并保留 8px 可拖动命中带 | 通过 | desktop top area |
| platform | Windows 标题栏安全区不遮挡内容 | 通过 | Windows safe area |
| runtime | 聊天审计使用 1152×900 同尺寸视口 | 通过 | {"width":1152,"height":900,"devicePixelRatio":2} |
| runtime | macOS 实际内容无伪标题栏上内边距 | 通过 | 0px |
| runtime | 窗口顶部与可见侧栏标题行均可拖动 | 通过 | {"body":"drag","titlebar":"drag"} |
| runtime | 侧栏实际渲染宽度为 240px | 通过 | 240px |
| runtime | 输入区实际为 768px 宽 / 14px 圆角 | 通过 | {"selector":"[class*='_composerHero'] [class*='_card']","box":{"x":308,"y":468,"width":768,"height":159},"background":"oklch(1 0 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"1px","borderRadius":"14px","boxShadow":"rgba(0, 0, 0, 0.04) 0px 4px 14px 0px","padding":"8px 0px 0px","appRegion":"none"} |
| runtime | 输入区实际应用语义浮层阴影 | 通过 | rgba(0, 0, 0, 0.04) 0px 4px 14px 0px |
| runtime | 项目行实际应用 8px 圆角 | 通过 | 8px |
| runtime | 当前工作区文件夹不使用选中色块，选中态只属于会话行 | 通过 | rgba(0, 0, 0, 0) |
| runtime | 设置页实际铺满窗口且无网页弹窗圆角 | 通过 | {"selector":"[class*='_panel']:has(> [class*='_nav'] [class*='_navTitle'])","box":{"x":0,"y":0,"width":1152,"height":845},"background":"oklch(1 0 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"0px","boxShadow":"none","padding":"0px","appRegion":"none"} |
| runtime | 设置导航实际为 240px 并避让 40px 顶栏 | 通过 | {"selector":"[class*='_panel'] > [class*='_nav']:has([class*='_navTitle'])","box":{"x":0,"y":0,"width":240,"height":845},"background":"rgba(0, 0, 0, 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"0px","boxShadow":"none","padding":"48px 8px 0px","appRegion":"none"} |
| runtime | 服务商入口实际使用 8px 控件圆角 | 通过 | 8px |
| runtime | 模型搜索实际应用 8px 圆角 | 通过 | 8px |
| runtime | 模型服务商卡片实际应用 14px 圆角 | 通过 | 14px |
| runtime | 模型行实际压缩到 50px 以内 | 通过 | 44px |
| runtime | Thinking 展开态为单一色块，标题与正文都不再拥有独立描边或底色 | 通过 | {"disclosure":{"selector":"[data-beautifului=\"thinking\"] [data-open=\"true\"]","box":{"x":318,"y":283,"width":756,"height":128},"background":"oklch(0.985 0.001 106.423)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"14px","boxShadow":"none","padding":"4px","appRegion":"none"},"row":{"selector":"[data-beautifului=\"thinking\"] [data-open=\"true\"] [role=\"button\"]","box":{"x":322,"y":287,"width":748,"height":32},"background":"rgba(0, 0, 0, 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"8px","boxShadow":"none","padding":"0px 8px","appRegion":"none"},"body":{"selector":"[data-beautifului=\"thinking\"] [data-open=\"true\"] > div:last-child","box":{"x":322,"y":323,"width":748,"height":84},"background":"rgba(0, 0, 0, 0)","color":"oklch(0.553 0.013 58.071)","borderWidth":"0px","borderRadius":"10px","boxShadow":"none","padding":"8px 12px 10px 28px","appRegion":"none"}} |
| runtime | 通用设置卡片实际为 820px / 14px 且居中 | 通过 | {"selector":"[data-pilot-settings-card=\"general\"]","box":{"x":286,"y":72,"width":820,"height":523},"background":"oklch(1 0 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"1px","borderRadius":"14px","boxShadow":"rgba(0, 0, 0, 0.04) 0px 1px 2px 0px","padding":"0px 20px","appRegion":"none"} |
| runtime | 文件树浮层、工具栏与目录行均真实渲染 | 通过 | {"panel":{"selector":"aside[aria-label='Files']","box":{"x":818,"y":12,"width":322,"height":821},"background":"oklch(1 0 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"1px","borderRadius":"14px","boxShadow":"rgba(0, 0, 0, 0.05) 0px 2px 8px 0px, rgba(0, 0, 0, 0.06) 0px 12px 32px 0px","padding":"0px","appRegion":"none"},"toolbarButton":{"selector":"aside[aria-label='Files'] header button","box":{"x":1013,"y":33,"width":28,"height":28},"background":"rgba(0, 0, 0, 0)","color":"oklch(0.147 0.004 49.25 / 0.72)","borderWidth":"0px","borderRadius":"8px","boxShadow":"none","padding":"0px","appRegion":"no-drag"},"treeRow":{"selector":"aside[aria-label='Files'] [class*='_row']","box":{"x":827,"y":90,"width":304,"height":30},"background":"rgba(0, 0, 0, 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"8px","boxShadow":"none","padding":"0px","appRegion":"none"}} |
| runtime | 轨迹 toolbar、时间线与 ledger 使用无外框色块表面 | 通过 | {"header":{"selector":"[data-pilot-conversation-header]","box":{"x":260,"y":0,"width":864,"height":52},"background":"rgba(0, 0, 0, 0)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"0px","boxShadow":"none","padding":"0px","appRegion":"none"},"toolbar":{"selector":"[role='toolbar'] > [class*='_inner']","box":{"x":260,"y":60,"width":872,"height":36},"background":"oklch(0.985 0.001 106.423)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"14px","boxShadow":"none","padding":"3px 4px","appRegion":"none"},"ledger":{"selector":"[class*='_ledger']","box":{"x":260,"y":164,"width":872,"height":669},"background":"oklch(0.985 0.001 106.423)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"14px","boxShadow":"none","padding":"0px","appRegion":"none"},"timeline":{"selector":"section[aria-label='Trajectory timeline']","box":{"x":260,"y":104,"width":872,"height":50},"background":"oklch(0.985 0.001 106.423)","color":"oklch(0.147 0.004 49.25)","borderWidth":"0px","borderRadius":"14px","boxShadow":"none","padding":"0px","appRegion":"none"}} |

> 本报告检查的是核心聊天、项目、设置、服务商/模型和桌面窗口壳层，不把尚未进入这些主流程的 Harness 插件页面计入分母。
