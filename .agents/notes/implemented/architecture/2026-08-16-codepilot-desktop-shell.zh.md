# Agent Note: Web profile 的 CodePilot 桌面外壳

Status: implemented

[English](2026-08-16-codepilot-desktop-shell.md) | 中文

## Problem

Web profile 已经提供完整的 Harness 插件组合，但要求用户安装 Node.js 并启动由浏览器承载的本地服务，会提高把它作为日常桌面客户端使用的门槛。如果在桌面框架中重新实现 agent 运行时，就会为会话、服务商、凭据、工具和插件制造第二个事实源。

## Decision

仓库在 [`apps/desktop`](../../../../apps/desktop/README.md) 下提供 Electron 应用，由它托管构建后的 `dsh web` profile 子进程。Electron 负责原生窗口行为、进程恢复、独立 Harness home 和多平台安装包；CodePilot 视觉主题由一个普通的 Client 插件负责。回环地址上的 Web 进程负责全部应用行为和数据 API。

应用读取 Web bundle 在完成启动后输出的 URL，而不是预测端口或增加桌面端专用的就绪接口。BrowserWindow 只接受该 URL 对应本机回环 origin 内的导航，关闭 Node integration，启用 context isolation 和 sandbox，并只提供范围受限的恢复操作与原生目录选择 preload。

模型和服务商管理仍由 `ui-settings-models`、`settings`、`credentials` 与 `llm` 组合完成。桌面应用既不镜像服务商状态，也不直接写入服务商配置。会影响运行时的管理功能继续以 DSH 插件形式进入组合。

设置组合把“服务商”和“模型”作为两个独立 section。服务商行与可搜索的添加服务商卡片网格通过共享的 LobeHub 品牌图标源解析已知服务身份，未知 route 则保留语义化 server 图标作为后备。由 shell 拥有的“通用设置”包含只在 loopback 下出现的设置文档操作，因为它属于运行配置；独立的“关于”section 则负责产品定位、版本与运行环境、本地诊断和上游支持链接。

## Runtime boundary

开发模式会直接启动仓库中已经构建的 CLI；打包时才把桌面包的生产依赖闭包暂存到 `.runtime`，再由 electron-builder 将该闭包实体化为应用资源。资源有意不放进 asar，因为 DSH 安装 profile 时会建立指回插件包目录的操作系统链接，而链接无法穿过归档边界。桌面包显式聚合运行时需要的 peer provider，避免依赖 workspace 安装时的依赖提升。桌面进程使用 Electron 自带的 Node 运行时与应用专属的 `DSH_HOME` 启动 CLI；现有文件设置、凭据、profile patches 和会话存储因而继续沿用各自已记录的格式与生命周期。

CodePilot 主题是建立在公开 Web 变量与生成后的 CSS Module 标签之上的普通 Client 插件。它自行拥有样式表、产品图标、完整的明暗主题变量，以及侧边栏、项目树、输入区、消息、设置、菜单、对话框、按钮和输入框的布局规则，但不改变这些界面的所有权或业务状态。空会话、展开与收起后的侧边栏以及“关于”页共用一份由确认后的桌面主图派生并嵌入插件的 Pilot Harness 图标。卸载插件时，它的样式表、内嵌图标与启用标记会一起清理，界面随即重新使用 Harness 原始主题。系统启动器派生资源的图形占画布 83.6%，应用内派生资源则保持铺满画布。在 macOS 上，展开后的侧边栏和设置控件会避开原生红绿灯区域，收起后的窄栏按钮会移到标题栏下方；Windows 继续使用 caption button inset 和 titlebar overlay。

现有 `ui-directory-picker-native` 插件仍然拥有两个 workspace directory-flow 插槽。隔离的 Electron preload 提供 `window.pilotHarness.pickDirectory()` 时，它的注入选择器会优先使用该方法；普通 Web 部署则回退到 `ctx.workspaces.pickDirectory()`。对话框归 Electron 主进程所有，workspace 插件仍然只通过已有 owner 回调接收选中的路径、取消或错误。

`ui-worktree` 插件拥有全高右侧文件树和每一行的三点菜单。重命名继续走该插件限制在 Workspace 内的接口；使用原生应用打开文件或文件夹会复用运行时受 loopback 保护的 `host.openPath` 操作，“将路径添加到输入框”则通过当前 Session 公开的 conversation input 服务写入 `@路径`。因此浏览器半边既不导入 Electron，也不导入 Host 文件系统模块；卸载插件会移除完整的文件树交互。

桌面项目树遵循 CodePilot 的直接选择约定：点击未激活项目会启动或打开它的空白会话；明确的添加项目入口会用一次点击调用原生目录选择器。首次模型引导以已有空白会话为前提，因此引导遮罩不会挂载到冷启动项目选择器之上。Playwright Electron 检查会在隔离的空 Harness home 中运行这些路径，验证 macOS 侧边栏按钮的位置，走通服务商选择，并捕获服务商、模型、通用设置与关于页面。

正式安装包只由 `Desktop` GitHub Actions 工作流产出。手动触发可以把临时签名的原生安装包作为 Actions Artifact 保留七天，但不能更新 Release。版本一致的 `v*` Tag 会同时发布 macOS、Windows 与 Linux 原生安装包，以及 CodePilot 主题、Worktree 文件、Schedule 摘要和 Session 日志导出插件的预构建 tarball，并附带一份校验和清单。每个插件 tarball 都声明 `dsh.bundle.patch` 并携带自己的 `cordis.patch.yml`，因此本地 Web profile 可以通过一条 `dsh plugin --profile web add <release-url>` 命令安装，不需要检出源码或手写 Patch。CI 会先把四个归档安装到空白 Web profile，并验证组合后的配置行 id，再发布这些产物。手动 macOS 产物使用 electron-builder 显式的临时签名身份与严格 Bundle 验证；带 Tag 的 macOS 产物则必须使用 Developer ID Application 证书和配置的 Team ID，因此缺失或不匹配的发布身份会阻止发布。因此根 README 会优先引导桌面用户前往 Releases，把源码构建说明留在“开发”部分，并且不再把本地打包描述为发布路径。

## Alternatives considered

**把 DSH 运行时 fork 进 CodePilot。** 这种方式可以直接使用现有 Electron 基建，但会重复 DSH 扩展模型，并要求把每个上游核心变更重新翻译到另一套运行时中。

**在没有托管能力的 webview 中显示 Web UI。** 这种方式能把窗口打包出来，却仍然要求用户自己处理安装、启动、端口分配、退出、崩溃恢复和数据目录。

**使用 Next.js 重写完整 Web UI。** 这种方式便于直接复用视觉样式，但会用一套并行 UI 协议替代现有客户端插件清单，并导致新的 DSH UI 插件必须手工移植后才能使用。

## Consequences

桌面客户端无需 fork 核心即可继承 DSH 的模型、服务商、插件和会话行为，其安装包可以面向 macOS、Windows 与 Linux。DSH 客户端插件或 wire 发生变更时，会通过同一套 Web 组合抵达桌面端。原生目录选择不再启动第二个 AppleScript 进程，并让选择框的模态关系附着在 Electron 窗口上。插件归档也为本地 Web 用户提供了低门槛安装路径，同时不会假装较旧的上游客户端已经公开 Pilot Harness 新增的呈现 Slot。

应用依赖 Web profile 可以在本机回环地址中嵌入，并依赖它输出完成启动后的 URL 日志。上游主题变量或侧边栏发生变化后，主题插件需要重新做视觉验证。原生依赖要求安装包在对应目标操作系统上构建。Developer ID 签名使 macOS 用户可以通过“隐私与安全性”批准未公证的预览版，而无需移除隔离元数据；要消除这次首次启动批准，仍需要完成公证。
