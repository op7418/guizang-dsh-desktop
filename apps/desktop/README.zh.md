# Pilot Harness 桌面端

[English](README.md) | 中文

Pilot Harness 是 DeepSeek Harness 的 CodePilot 风格桌面发行版。Electron 负责原生窗口、本地运行时生命周期、恢复页面、桌面主题和安装包；DeepSeek Harness 插件树仍然是应用运行时。

## 架构

桌面进程在操作系统分配的本机回环端口上启动构建后的 `@deepseek-ai/dsh` CLI，等待它输出已经完成启动的 `dsh web:` URL，然后在启用沙箱的 BrowserWindow 中加载该地址。桌面进程为子进程提供位于 Electron 用户数据目录中的独立 `DSH_HOME`，保留经过脱敏且有长度上限的诊断日志，并可在不重启桌面进程的情况下重启子进程。

Web UI 仍是 [Harness 架构](../../docs/architecture.md)中记录的 DSH 浏览器组合。桌面样式表提供完整的明暗主题变量，并为外壳、侧边栏、项目树、会话输入区、设置、菜单和对话框提供组件级布局；它不修改 agent loop、会话日志、工具管线、LLM 适配器或 Web RPC 实现。

项目选择仍属于现有的 `ui-directory-picker-native` 插件。在桌面环境中，该插件使用隔离 preload 提供的原生文件夹对话框；普通 Web 部署继续通过 Host directory-picker provider 工作。

## 模型、服务商和插件管理

模型页面使用已有的 `@deepseek-ai/dsh-client-ui-settings-models` 插件。服务商配置通过 `ctx.settings` 流转，API 密钥通过 `ctx.credentials` 流转，实时模型路由通过 `ctx.llm` 流转；因此，自定义 OpenAI-compatible 服务商仍然是普通 DSH 插件配置，而不是桌面端自建的数据记录。

插件设置页面同样由 DSH 客户端和 Host 插件清单组合而成。以后凡是会改变运行时行为的管理功能，都应进入 DSH 插件和 patch layer；菜单、窗口恢复、打包等只属于桌面端的问题则进入这个应用。

## 开发

在仓库根目录执行：

```sh
pnpm install
pnpm run desktop:dev
```

`desktop:dev` 会构建 DSH Host 和 Web 产物，直接使用仓库内的 CLI，构建 Electron 主进程和 preload bundle，然后启动客户端。打包产物由 electron-builder 按同一份 `@deepseek-ai/dsh` 依赖声明收集运行时闭包，不再维护第二套暂存运行时。

使用以下命令运行桌面端专项检查：

```sh
pnpm run desktop:test
pnpm --filter @deepseek-ai/dsh-desktop run typecheck
pnpm --filter @deepseek-ai/dsh-desktop run test:e2e
```

Electron 端到端检查会使用隔离的空 Harness home 启动客户端，通过 preload/IPC 链路选择两个真实目录，从侧边栏切换项目，并打开模型与服务商管理。首次模型引导只会在项目已被接纳后开始，因此不会再用遮罩拦截第一次目录选择。该命令会等待动画几何稳定，写出运行时 UI 产物，并把 Token、圆角、对齐、设置、模型、Worktree 与 Trajectory 审计作为阻断性的第二阶段执行。启动 Electron 前，它还会移除继承的 `ELECTRON_RUN_AS_NODE` 值，避免 IDE 内置终端把 GUI 运行悄悄转换成 Node 进程。

## 打包

正式安装包只由 `.github/workflows/desktop.yml` 构建和上传，本地打包不属于发布路径。手动触发工作流会使用明确的 macOS 临时签名配置和严格 Bundle 校验，生成保留七天的 Actions Artifact，但不能更新 GitHub Release。版本一致的 `v*` Tag 会在原生 GitHub runner 上构建 DMG/ZIP、NSIS、AppImage/DEB/RPM 与插件 bundle，生成 `SHA256SUMS.txt`，并且只在全部必需 Job 成功后发布 Release。由于未归档的 DSH 依赖闭包含数万个资源，macOS 打包会把递归遍历交给 Apple 原生 `codesign`，不再使用默认的 JavaScript 签名器；现有 `afterSign` 门禁仍会做严格的深度校验。带 Tag 的 macOS 构建会导入仓库 Actions Secrets 中的 `MAC_CERT_P12_BASE64`、`MAC_CERT_PASSWORD` 与 `APPLE_TEAM_ID`；若产物不属于配置的 Developer ID Team，则会在上传前失败。证书材料只保存在 GitHub Secrets 中，不进入仓库或开发者电脑上的打包目录。公证仍由部署流程负责。

确认后的正方形图稿保存在 `assets/icon-master.png`。`pnpm --filter @deepseek-ai/dsh-desktop run icons` 会为系统启动器生成图形占比 83.6% 的平台版 PNG、ICNS、ICO 与 Linux 多尺寸资源，同时生成供应用内界面使用、图形铺满画布的 `brand-icon.png`。同一生成器还会把紧凑版本嵌入可卸载的 CodePilot 主题，使 Dock、恢复页、空会话、侧边栏、“关于”页、打包应用与安装包共用同一源图，并避免把系统启动器的留白带进应用界面。

## 安全与数据

Renderer 启用了 context isolation 和 sandbox，并关闭 Node integration。顶层导航被限制在当前本机回环 origin，新开的 HTTP(S) 窗口交给系统浏览器，浏览器权限请求默认拒绝。Preload 只暴露原生文件夹选择、重启、打开数据目录、复制诊断信息、平台和版本操作。

Harness 默认数据目录位于该应用专属的 Electron 用户数据目录。开发或托管部署可以用 `PILOT_HARNESS_DSH_HOME` 覆盖它，并用 `PILOT_HARNESS_DSH_ENTRY` 选择其他已构建的 DSH CLI 入口。

## 已知限制

- 桌面主题依赖当前 DSH 公开主题变量名与显式的 `data-pilot-*` 组件 Hook 提供布局，不再选择生成的 CSS Module 类名；但上游 Slot 或 DOM 契约变化后仍需重新做视觉回归。
- 第一版使用 DSH 的文件型凭据服务商。如果需要阻止同一系统用户下的 agent 进程读取已存密钥，后续应实现操作系统 Keychain 凭据插件。
- 带 Tag 的 macOS 安装包必须带有经过验证的 Developer ID 签名，但尚未公证。Windows 与 Linux 安装包在各自发布流程获得平台签名身份之前仍保持未签名状态。
- macOS 已做过本地实机验证；macOS、Windows 与 Linux 都会在原生 CI runner 上执行构建和 Electron 流程校验，但发布候选版本仍需在目标桌面环境补安装、原生窗口、签名与更新冒烟。
