# Agent Note: Keep the CodePilot dark palette and native shell synchronized

Status: implemented

[English](2026-08-19-codepilot-dark-native-theme-sync.md) | 中文

## Problem

CodePilot 样式表会在 Harness 原始主题之后完整覆盖浅色语义配色，却只提供了部分深色覆盖。结果有 42 个语义、组件和阴影 Token 在深色模式下继续使用浅色值，其中包括 Markdown 背景、按钮选中态、滚动条、输入区域和阴影。Electron 原生材质与标题栏颜色又独立跟随操作系统，因此应用内明确选择的主题也可能与客户端外层窗口不一致。

## Decision

CodePilot 主题会为浅色分支中定义的每一个 Pilot 颜色/平台表面 Token，以及每一个 `--dsw-alias-*`、`--dsw-specific-*` 和 `--dsw-shadow-*` Token 明确定义深色值。深色选区与弥散阴影使用同一套反转后的 CodePilot 调色板，tooltip 覆盖会消费专用的深色表面 Token，不会反转成浅色主按钮颜色。macOS 会基于 body 作用域中的深色值重新计算半透明侧栏和浮层，不再继承文档根节点上已经按浅色计算完成的材质值。包测试和 UI 审计都会从样式表中推导这些 Token 集合，并在深色分支缺少对应项时失败。

CodePilot Client 插件依赖 Harness 主题服务，并通过可选的桌面 preload 方法转发每次选择的内置主题偏好。自定义注册主题会转发其解析后的浅色或深色类型。主进程只接受允许的 renderer 发起的 IPC，把输入限制为 `system`、`light` 和 `dark`，将其持久化到 Electron user-data 目录，并在创建首个窗口之前恢复。原生主题变化会同步刷新 Windows 标题栏按钮以及 Windows/Linux 的不透明窗口背板。浏览器客户端没有该桥接，只应用 CSS。

## Alternatives considered

**让缺失 Token 继续使用原始深色配色。** 未采用：CodePilot 浅色选择器加载更晚，而且优先级相同或更高；除非插件在自己的深色选择器中明确覆盖，否则浅色值仍会胜出。

**用不透明的渲染层颜色遮住原生材质差异。** 未采用：该方式会破坏 macOS 毛玻璃材质，同时仍无法让原生标题栏按钮采用相同主题。

**只转发当前解析出的浅色或深色类型。** 未采用：把 `system` 转换成 Electron 的明确主题来源，会使原生材质无法继续跟随后续的系统主题变化。偏好属于 Electron 内置值时会直接作为来源保留。

## Consequences

所有由 CodePilot 管理的语义表面会在主题变化时保持一致，桌面窗口在启动时和运行期间都会跟随同一个偏好，而浏览器客户端不会暴露该桥接。主题包增加了对 Harness 主题服务的依赖，桌面 IPC 则增加了一个严格校验的外观操作和一个不含敏感信息的 user-data 文件。插件卸载后不再继续转发，但会保留当前原生主题来源，从而避免热更新或可逆样式卸载过程中发生无关的配色跳变。
