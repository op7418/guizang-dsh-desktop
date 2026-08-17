# CodePilot UI 适配覆盖率

- 总体：4/45（9%）
- tokens：0/14（0%）
- components：3/16（19%）
- icons：0/7（0%）
- platform：1/8（13%）

| 类别 | 检查项 | 状态 | 证据 |
|---|---|---:|---|
| tokens | 基础圆角为 CodePilot 的 1rem | 未完成 | --pilot-radius-base |
| tokens | 圆角阶梯 12/14/16/20/24/28 | 未完成 | desktop radius scale |
| tokens | 背景 token 使用 CodePilot OKLCH 值 | 未完成 | --pilot-background |
| tokens | 前景 token 使用 CodePilot OKLCH 值 | 未完成 | --pilot-foreground |
| tokens | 卡片与浮层 token 对齐 | 未完成 | card/popover |
| tokens | 主色 token 对齐 | 未完成 | --pilot-primary |
| tokens | 次级与弱化表面 token 对齐 | 未完成 | secondary/muted |
| tokens | 边框与输入 token 对齐 | 未完成 | border/input |
| tokens | 侧栏 token 对齐 | 未完成 | --pilot-sidebar |
| tokens | 焦点环 token 对齐 | 未完成 | --pilot-ring |
| tokens | 输入区使用 CodePilot diffuse shadow | 未完成 | --pilot-shadow-diffuse |
| tokens | 窗口/侧栏/浮层使用平台表面 token | 未完成 | platform surface tokens |
| tokens | macOS UI 字体栈单独适配 | 未完成 | platform font |
| tokens | 深色模式具有同构 CodePilot token | 未完成 | dark token block |
| components | 工作区与模式操作栏位于输入框下方 | 通过 | ConversationRoot order |
| components | 输入框使用 24px 大圆角例外 | 未完成 | composer radius |
| components | 导航行使用 12px 圆角 | 未完成 | nav radius |
| components | 搜索/选择输入使用 28px 圆角 | 未完成 | input radius |
| components | 菜单使用 14px、菜单项使用 12px | 未完成 | menu geometry |
| components | 展开层具备 CodePilot 的淡入/缩放动效 | 未完成 | popover open state |
| components | Hover、active、expanded 状态完整 | 未完成 | interactive state selectors |
| components | 侧栏尺寸与表面对齐 | 未完成 | sidebar surface |
| components | 项目与会话行复用导航圆角/hover | 未完成 | project/session row selectors |
| components | 设置页为完整桌面工作区而非网页弹窗 | 通过 | settings shell |
| components | 设置内容使用与 CodePilot 一致的居中内容宽度 | 未完成 | settings content width |
| components | 模型页搜索与筛选控件对齐 | 未完成 | model toolbar |
| components | 模型分组与行使用 CodePilot 卡片层级 | 未完成 | model list geometry |
| components | 服务商卡片与操作按钮使用统一组件 token | 未完成 | provider cards |
| components | 键盘焦点为 3px 语义焦点环 | 未完成 | focus visible |
| components | 减少动态效果偏好受支持 | 通过 | reduced motion |
| icons | 使用 CodePilot 的 HugeIcons 语义图标依赖 | 未完成 | package dependencies |
| icons | 具备统一 CodePilotIcon 语义映射层 | 未完成 | CodePilotIcon.tsx |
| icons | 侧栏核心图标迁到语义层 | 未完成 | SidebarRoot.tsx |
| icons | 设置导航图标迁到语义层 | 未完成 | SettingsRoot.tsx |
| icons | 项目区核心图标迁到语义层 | 未完成 | WorkspaceBrowser/Picker |
| icons | 模型页图标迁到语义层 | 未完成 | ModelCatalogSection.tsx |
| icons | 服务商使用 CodePilot 同源品牌图标库 | 未完成 | provider brand icon |
| platform | macOS 使用 hiddenInset | 通过 | BrowserWindow titleBarStyle |
| platform | macOS 红绿灯位置为 CodePilot 20/21 | 未完成 | trafficLightPosition |
| platform | macOS 使用 under-window vibrancy | 未完成 | vibrancy |
| platform | macOS 使用透明原生窗口背板 | 未完成 | transparent BrowserWindow |
| platform | macOS 原生材质跟随窗口状态 | 未完成 | visualEffectState |
| platform | Windows 使用 44px 透明标题栏叠层 | 未完成 | titleBarOverlay |
| platform | macOS 内容与窗口栏融合、无全宽空白占位 | 未完成 | desktop top area |
| platform | Windows 标题栏安全区不遮挡内容 | 未完成 | Windows safe area |

> 本报告检查的是核心聊天、项目、设置、服务商/模型和桌面窗口壳层，不把尚未进入这些主流程的 Harness 插件页面计入分母。
