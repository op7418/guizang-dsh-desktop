# Agent Note: CodePilot 主题插件与 UI Token 收口

Status: implemented

[English](2026-08-16-codepilot-theme-plugin-and-ui-token-pass.md) | 中文

## Problem

桌面端表现层逐渐散落在 Electron 外壳和互不相关的组件样式中。这让 CodePilot 皮肤难以单独停用，也造成组件圆角与文字颜色不一致；同时，上游模型服务商目录中不属于 CodePilot 产品的条目会直接暴露，聊天统计信息也没有归入预期的“上下文”浮层。

## Decision

CodePilot 表现层由普通 Harness Client 插件 `@deepseek-ai/dsh-client-ui-codepilot-theme` 负责，并由桌面 profile 挂载。插件自行拥有样式表与启用标记：加载时应用 CodePilot Token 层；卸载时恢复原标记并移除插件样式表，使 Harness 原始表现层重新生效，同时不改变核心会话、服务商或工具行为。

视觉系统收敛为两级几何规范：交互控件使用 8px，容器表面使用 14px。文字映射为四级语义 Token，卡片、浮层、输入框、边框、焦点环和平台材质统一使用共享 Token。主页与设置导航栏在 macOS 红绿灯区域内使用同一块连续的侧栏材质。折叠侧栏的产品图标、对话、添加工作区和搜索共用一条居中的 36px 控件中心线；操作图标保持 16px 与 4px 间距。输入区的工作区选择器使用 14px 图标、13px/20px 文字与 6px 内间距，并阻止按钮内边距污染文字节点。空会话、侧边栏品牌位与“关于”页共用插件内嵌的 Pilot Harness 图标；系统启动器则使用另一份经过光学留白校准的派生资源。平台专属标题栏规则仍由 Electron preload 属性限定，因此主题也能运行在普通浏览器版 Harness 客户端中。

会话组合继续把 Workspace 与 Mode 控件放在输入区底部，但把 Token、缓存、耗时、Turn 与 Step 等明细投射到常驻的“上下文”浮层。Worktree 插件通过会话标题栏 utility slot，把唯一的 Files 控件放在“对话”和“轨迹”旁，并通过可叠加的 `shell.right-sidebar` Dock 渲染文件树。打开 Files 会增加一列收窄对话区的全高布局，而不是悬浮覆盖内容；左侧栏不再保留重复入口。会话标题栏不再绘制装饰性分割线。

服务商和模型设置会通过 CodePilot 目录边界投射已安装的 Harness 服务商 route。Azure-like route 与不可用的 Anthropic 目录默认项等不受支持的上游内置目录不会进入 UI，但显式安装的外部服务商插件仍然可以被发现。桌面的多服务商适配器以休眠状态启动，只有连接真实服务商后，模型才会进入选择器。已知 route 统一使用共享的服务商品牌图标组件，未知插件 route 则保留语义化后备图标。

Beautiful UI 的交互模式按组件适配到 Prompt Bar、上下文卡片、思考展开、工具标签、代码块、搜索结果和 Worktree 导航。Harness Slot 与 Store 仍然是状态边界；演示运行时与自动播放行为不会被引入。

## Alternatives considered

**继续由 Electron 注入完整主题。** 这种方式会让 Harness 插件清单无法体现表现层所有权，也无法在浏览器端复用或独立卸载。

**Fork 设置页与会话页。** 这种方式可以完全控制标记结构，但会重复 Harness 的状态、Slot 与交互行为，也会提高继续吸收上游 UI 插件的成本。

**暴露全部上游服务商 route。** 这种方式可以原样显示底层 registry，但会向用户呈现 CodePilot 不支持的选项，并保留 Azure-like 的目录噪音。当前边界仍允许显式安装的外部插件被发现，同时不会把每一个上游内置 route 当作产品默认项。

## Consequences

主题会出现在标准插件清单中，并可独立于功能插件停用。停用主题会恢复 Harness 样式，但按设计不会关闭仍处于启用状态的 Worktree、上下文组合等独立功能。若要回到完整的原始界面，还需要停用这些功能插件，或切换到原始 profile。

实现没有 fork Harness 运行时，因此仍可直接吸收上游核心更新。公开 Slot 或生成样式发生变化后，仍需重新运行 UI 审计。桌面 E2E 审计会在固定视口下记录主题生命周期、服务商目录、标题栏几何、原生拖拽区域、平台避让区、折叠侧栏图标节奏、工作区选择器对齐、Worktree 右侧栏几何、上下文浮层、设置页面与轨迹布局。

## Verification

- CodePilot UI 覆盖：80/80 项检查通过。
- Beautiful UI 适配：16/16 项检查通过。
- Electron 桌面 E2E、客户端测试、Host 测试、类型检查和生产构建全部通过。
- 当前右侧栏截图与运行时证据存放在 `docs/audits/2026-08-17-right-sidebar`；更完整的改动前、改动后与左右对照截图仍存放在 `docs/audits/2026-08-16-ui-token-pass`。
- 折叠侧栏与工作区选择器的像素审计、聚焦前后对照和通过的设计 QA 存放在 `docs/audits/2026-08-17-icon-rhythm` 与 `design-qa.md`。
