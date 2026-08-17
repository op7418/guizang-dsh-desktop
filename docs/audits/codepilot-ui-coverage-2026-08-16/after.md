# CodePilot UI 适配覆盖率

- 总体：57/57（100%）
- tokens：14/14（100%）
- components：16/16（100%）
- icons：7/7（100%）
- platform：8/8（100%）
- runtime：12/12（100%）

| 类别 | 检查项 | 状态 | 证据 |
|---|---|---:|---|
| tokens | 基础圆角为 CodePilot 的 1rem | 通过 | --pilot-radius-base |
| tokens | 圆角阶梯 12/14/16/20/24/28 | 通过 | desktop radius scale |
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
| components | 工作区与模式操作栏位于输入框下方 | 通过 | ConversationRoot order |
| components | 输入框使用 24px 大圆角例外 | 通过 | composer radius |
| components | 导航行使用 12px 圆角 | 通过 | nav radius |
| components | 搜索/选择输入使用 28px 圆角 | 通过 | input radius |
| components | 菜单使用 14px、菜单项使用 12px | 通过 | menu geometry |
| components | 展开层具备 CodePilot 的淡入/缩放动效 | 通过 | popover open state |
| components | Hover、active、expanded 状态完整 | 通过 | interactive state selectors |
| components | 侧栏实际默认宽度与表面对齐 | 通过 | sidebar surface + desktop layout default |
| components | 项目与会话行复用导航圆角/hover | 通过 | project/session row selectors |
| components | 设置页为完整桌面工作区而非网页弹窗 | 通过 | settings shell |
| components | 设置内容使用与 CodePilot 一致的居中内容宽度 | 通过 | settings content width |
| components | 模型页搜索与筛选控件对齐 | 通过 | model toolbar |
| components | 模型分组与行使用 CodePilot 卡片层级 | 通过 | model list geometry |
| components | 服务商卡片与操作按钮使用统一组件 token | 通过 | provider cards |
| components | 键盘焦点为 3px 语义焦点环 | 通过 | focus visible |
| components | 减少动态效果偏好受支持 | 通过 | reduced motion |
| icons | 使用 CodePilot 的 HugeIcons 语义图标依赖 | 通过 | ui-primitives package dependencies |
| icons | 具备统一 CodePilotIcon 语义映射层 | 通过 | CodePilotIcon.tsx |
| icons | 侧栏核心图标迁到语义层 | 通过 | SidebarRoot.tsx |
| icons | 设置导航图标迁到语义层 | 通过 | SettingsRoot.tsx |
| icons | 项目区核心图标迁到语义层 | 通过 | WorkspaceBrowser/Picker |
| icons | 模型页图标迁到语义层 | 通过 | ModelCatalogSection.tsx |
| icons | 服务商使用 CodePilot 同源品牌图标库 | 通过 | provider brand icon |
| platform | macOS 使用 hiddenInset | 通过 | BrowserWindow titleBarStyle |
| platform | macOS 红绿灯位置为 CodePilot 20/21 | 通过 | trafficLightPosition |
| platform | macOS 使用 under-window vibrancy | 通过 | vibrancy |
| platform | macOS 使用透明原生窗口背板 | 通过 | transparent BrowserWindow |
| platform | macOS 原生材质跟随窗口状态 | 通过 | visualEffectState |
| platform | Windows 使用 44px 透明标题栏叠层 | 通过 | titleBarOverlay |
| platform | macOS 内容与窗口栏融合、无全宽空白占位 | 通过 | desktop top area |
| platform | Windows 标题栏安全区不遮挡内容 | 通过 | Windows safe area |
| runtime | 聊天审计使用 1152×900 同尺寸视口 | 通过 | {"width":1152,"height":900,"devicePixelRatio":2} |
| runtime | macOS 实际内容无伪标题栏上内边距 | 通过 | 0px |
| runtime | 侧栏实际渲染宽度为 240px | 通过 | 240px |
| runtime | 输入区实际为 768px 宽 / 24px 圆角 | 通过 | {"selector":"[class*='_composerHero'] [class*='_card']","box":{"x":308,"y":734,"width":768,"height":118},"background":"oklch(1 0 0)","borderRadius":"24px","boxShadow":"rgba(0, 0, 0, 0.1) 0px 12px 40px -8px, rgba(0, 0, 0, 0.04) 0px 4px 12px -4px","padding":"10px 0px 0px"} |
| runtime | 输入区实际应用 diffuse shadow | 通过 | rgba(0, 0, 0, 0.1) 0px 12px 40px -8px, rgba(0, 0, 0, 0.04) 0px 4px 12px -4px |
| runtime | 项目行实际应用 12px 圆角 | 通过 | 12px |
| runtime | 设置页实际铺满窗口且无网页弹窗圆角 | 通过 | {"selector":"[class*='_panel']:has(> [class*='_nav'] [class*='_navTitle'])","box":{"x":0,"y":0,"width":1152,"height":845},"background":"oklch(1 0 0)","borderRadius":"0px","boxShadow":"none","padding":"0px"} |
| runtime | 设置导航实际为 240px 并避让 40px 顶栏 | 通过 | {"selector":"[class*='_panel'] > [class*='_nav']:has([class*='_navTitle'])","box":{"x":0,"y":0,"width":240,"height":845},"background":"rgba(0, 0, 0, 0)","borderRadius":"0px","boxShadow":"none","padding":"48px 8px 0px"} |
| runtime | 服务商入口实际使用圆形按钮半径 | 通过 | 999px |
| runtime | 模型搜索实际应用 28px 圆角 | 通过 | 28px |
| runtime | 模型服务商卡片实际应用 16px 圆角 | 通过 | 16px |
| runtime | 模型行实际压缩到 50px 以内 | 通过 | 44px |

> 本报告检查的是核心聊天、项目、设置、服务商/模型和桌面窗口壳层，不把尚未进入这些主流程的 Harness 插件页面计入分母。
