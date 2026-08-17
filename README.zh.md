<p align="center">
  <img src="apps/desktop/assets/brand-icon.png" width="112" height="112" alt="Pilot Harness 图标">
</p>

<h1 align="center">Pilot Harness</h1>

[English](README.md) | 中文

<p align="center"><strong>为 DeepSeek Harness 打造的 CodePilot 风格桌面客户端与插件套件。</strong></p>

<p align="center">把 DeepSeek Harness 的插件运行时装进一个专注的原生客户端，可视化管理服务商与多模态模型，并让桌面扩展继续保持为普通 Harness 插件。</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#单独使用插件">插件</a> ·
  <a href="apps/desktop/README.md">架构</a> ·
  <a href="LICENSE">MIT 许可证</a>
</p>

<p align="center">
  <img alt="许可证：MIT" src="https://img.shields.io/badge/license-MIT-171717">
  <img alt="平台：macOS、Windows、Linux" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-171717">
  <img alt="DeepSeek Harness 插件套件" src="https://img.shields.io/badge/DeepSeek%20Harness-plugin%20suite-4f6ef7">
</p>

## 为什么选择 Pilot Harness

DeepSeek Harness 的“一切皆插件”架构很强大，但默认体验围绕通过 CLI 启动的 Web UI 设计。Pilot Harness 保留这套运行时模型，同时补上一个日常桌面产品应有的部分：

- **真正的桌面客户端**——Electron 将本地 Harness 运行时打包到 macOS、Windows 与 Linux，负责原生窗口行为，并在启动异常时提供恢复页面。
- **更安静的 CodePilot 风格界面**——统一 Token、圆角、菜单、Hover、设置卡片、Markdown、对话/轨迹切换与平台化标题栏。
- **服务商与模型管理**——连接受支持的服务商，声明 OpenAI 兼容接口，将凭证和普通设置分开管理，浏览实时模型目录，并识别支持图片输入的模型。
- **不杂乱的工作区上下文**——对话列表可展示分支、状态、提醒摘要、模式与模型，Files 则作为真正的右侧栏打开。
- **插件优先的扩展方式**——主题、Worktree 侧栏、Schedule 摘要与 Session 日志导出仍是 Cordis/DeepSeek Harness 配置行，而不是写死在桌面端的业务逻辑。
- **可逆的定制**——停用 CodePilot 主题行后，产品图标与视觉覆盖会一起移除，原始 Harness 样式可以重新接管界面。

Pilot Harness 不替换 DeepSeek Harness 的 agent loop、Session 日志、工具链、服务商契约或 RPC 实现。Electron 负责打包与原生集成，组合后的 Harness 插件树仍然是应用运行时。

## 快速开始

<p align="center"><a href="https://github.com/op7418/guizang-dsh-desktop/releases/latest"><strong>下载 Pilot Harness</strong></a></p>

请从 [GitHub Releases](https://github.com/op7418/guizang-dsh-desktop/releases/latest) 下载适合你系统的安装包：

| 平台 | 选择这个安装包 |
|---|---|
| macOS（Apple Silicon） | 使用 <code>.dmg</code> 安装，或下载 <code>.zip</code> 便携版 |
| Windows | <code>.exe</code> 安装程序 |
| Linux | <code>.AppImage</code>、<code>.deb</code> 或 <code>.rpm</code> |

安装后打开 Pilot Harness，选择工作区，再前往**设置 → 服务商**连接服务商，并选择它提供的模型。桌面客户端无需另外安装 DeepSeek Harness。

当前预览安装包尚未签名，因此系统可能要求你确认首次启动。源码启动和打包说明放在[开发](#development)部分，不再占用普通用户的安装流程。

## 包含哪些内容

| 范围 | Pilot Harness 增加的能力 | 所属模块 |
|---|---|---|
| 桌面外壳 | 原生窗口、本地运行时生命周期、目录选择、恢复页、安装包与平台图标 | Electron 应用 |
| 视觉系统 | CodePilot 风格设计 Token 与组件契约 | <code>@deepseek-ai/dsh-client-ui-codepilot-theme</code> |
| 工作区文件 | 右侧栏、文件数量、分支摘要、条目操作与 <code>@path</code> 插入 | <code>@deepseek-ai/dsh-ui-worktree</code> |
| 提醒摘要 | Session Hover 详情中的生效提醒数量与最近时间 | <code>@deepseek-ai/dsh-ui-schedule-summary</code> |
| Session 导出 | 轨迹工具栏与 <code>/export</code> 提供的单 Session ZIP 导出 | <code>@deepseek-ai/dsh-session-log-export</code> |
| 服务商与模型 | 可配置服务商 Adapter、凭证/设置 UI、实时目录与多模态标记 | 现有 Harness 插件加 Pilot Harness 桌面 profile |

服务商/模型体验有意采用 **profile 组合**，而不是重新实现一个服务商插件。它挂载现有 Adapter、Settings 与 Credentials 契约，并且只在真实服务商返回可用模型后替换桌面的默认模型占位项。

## 单独使用插件

桌面客户端已经内置下面所有插件。如果你使用本地 DeepSeek Harness Web profile，只需用一条命令安装想要的功能；每个 Release 产物都是预构建的 <code>dsh.bundle</code>，不需要克隆仓库、手写 YAML 或在本地构建。

### CodePilot 主题

~~~sh
dsh plugin --profile web add https://github.com/op7418/guizang-dsh-desktop/releases/latest/download/deepseek-ai-dsh-client-ui-codepilot-theme-0.1.0-rc.5.tgz
~~~

应用 Pilot Harness 视觉系统与产品图标。移除插件后会恢复 Harness 原始界面。详见[主题说明](packages/client/ui-codepilot-theme/README.md)。

### 文件侧栏

~~~sh
dsh plugin --profile web add https://github.com/op7418/guizang-dsh-desktop/releases/latest/download/deepseek-ai-dsh-ui-worktree-0.1.0-rc.5.tgz
~~~

增加限制在工作区内的右侧文件栏、文件数、分支摘要、条目操作与 <code>@路径</code> 插入。详见[文件插件说明](packages/workspace/ui-worktree/README.md)。

### 提醒摘要

~~~sh
dsh plugin --profile web add https://github.com/op7418/guizang-dsh-desktop/releases/latest/download/deepseek-ai-dsh-ui-schedule-summary-0.1.0-rc.5.tgz
~~~

在 Session 悬浮详情中增加活动提醒元数据，上游 Schedule 插件仍然是提醒状态权威。详见[提醒插件说明](packages/schedule/ui-schedule-summary/README.md)。

### Session 日志导出

~~~sh
dsh plugin --profile web add https://github.com/op7418/guizang-dsh-desktop/releases/latest/download/deepseek-ai-dsh-session-log-export-0.1.0-rc.5.tgz
~~~

在**轨迹**工具栏和 <code>/export</code> 命令中增加单 Session ZIP 导出。详见[导出插件说明](packages/session-query/session-log-export/README.md)。

安装后重启 Web profile，并用 <code>dsh --profile web --dump-config</code> 确认新增配置行。文件侧栏和提醒摘要依赖 Pilot Harness v0.1.0 内置的 UI Slot 契约；较旧的上游 Harness 可以安装这两个 bundle，但无法呈现它们的 UI。

移除插件时使用其详情页显示的同名包，例如：

~~~sh
dsh plugin --profile web remove @deepseek-ai/dsh-ui-worktree
~~~

<a id="development"></a>

## 开发

~~~sh
git clone https://github.com/op7418/guizang-dsh-desktop.git
cd guizang-dsh-desktop
pnpm install
pnpm run desktop:dev
~~~

构建安装包或运行桌面检查：

~~~sh
pnpm run desktop:pack
pnpm run desktop:test
pnpm --filter @deepseek-ai/dsh-desktop run typecheck
pnpm --filter @deepseek-ai/dsh-desktop run test:e2e
~~~

原生 CI 矩阵会在 macOS、Windows 与 Linux 上构建、测试、运行 Electron 流程并打包。正式发布候选版本仍需在目标机器上验证安装、标题栏、签名、公证和更新流程。

底层系统资料见 [DeepSeek Harness 架构](docs/architecture.md)、[开发指南](docs/development.md)与[桌面架构](apps/desktop/README.md)。

## 上游、署名与商标说明

Pilot Harness 是一个独立社区项目，派生自 MIT 许可的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，视觉体验参考了 [CodePilot](https://github.com/op7418/CodePilot)。它不是 DeepSeek 官方产品，也未获得 DeepSeek 的背书或附属关系。“DeepSeek”“DeepSeek Harness”与“CodePilot”归各自权利人所有。

## 许可证

Pilot Harness 使用 [MIT 许可证](LICENSE)开源。第三方软件及许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
