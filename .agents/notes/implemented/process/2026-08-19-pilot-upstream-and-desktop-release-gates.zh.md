# Agent Note: 用可安装产物门禁约束 Pilot 上游同步与桌面发布

Status: implemented

[English](2026-08-19-pilot-upstream-and-desktop-release-gates.md) | 中文

## Problem

Pilot Harness 跟踪更新频繁的上游发布线，并通过 GitHub Actions 发布三个平台的原生桌面客户端。仓库默认分支是 `main`，但继承的主 CI 只监听 `master`；上游同步只验证部分源码态桌面检查就直接推送到 `main`；发布任务也可以在没有完整源码检查、且未启动打包产物时对外发布。发布选择依赖创建时间和可移动 tag，macOS 又递归签名 helper 而没有应用其必需的继承 entitlements。因此，源码态测试通过与不可用发布产物可能同时出现。

## Decision

主 CI 工作流会在每次 `main` 推送上运行完整的托管 Linux 聚合检查和 CodePilot UI 静态审计。定时上游同步只能从 `main` 运行，读取配置中的上游仓库，使用严格的 DSH tag SemVer 解析 GitHub 最新的非 draft、非 prerelease 发布，拒绝降级，并拒绝 commit 已变化的已记录 tag。无冲突合并会在 fast-forward 推送前运行 `check:ci:linux-primary`、桌面构建、桌面测试、桌面 typecheck 和同一份 UI 静态审计。版本元数据使用独立 commit 落库，不会 amend 无关的 Pilot commit。合并冲突与签名配置缺失 issue 使用精确标题，条件消失后会关闭。

Pilot 自身修复使用 `main` 上的手动 `Release Pilot Harness changes` 工作流。该流程要求当前跟踪的发布已存在，在同一上游版本下选择高于全部已发布 `pilot.N` 的下一个修订号，运行同样的完整源码检查，提交两个版本字段，然后派发原生发布。它与上游同步共用一个不取消的 concurrency group，两个写入者不会竞争。

每个发布在桌面工作流中都有独立的完整 Linux 源码质量 job，并与原生平台 matrix 和插件 bundle 安装校验并列。每个原生 runner 都使用隔离的 Harness home 启动打包应用，且必须让内置 DSH runtime 加载到能捕获真实 renderer 截图的阶段。发布 job 依赖全部原生 leg、插件 bundle 和源码质量 job。经测试的发布产物解析器会在生成稳定下载名之前，要求每个平台的预期输出恰好出现一次。含 prerelease 段的上游版本保持为 GitHub prerelease，不会成为 `latest`。

macOS 会先用 inherit entitlements 逐个签名嵌套 helper 应用，然后签名外层应用；最初的递归签名只用于处理 helper bundle 外的嵌套代码。校验会在配置时要求 Developer ID 身份、预期 Team ID、hardened-runtime 标志、strict deep 签名有效性，以及每个 helper 上的 JIT/inherit entitlements。GitHub 托管打包仍是唯一发布路径；这些工作流中可变的第三方安装与发布 action 被钉定到已审阅 commit。

## 维护边界

上游合并并非文件复制式 overlay。Pilot 的不绑定服务商引导会在 `ui-settings-models` 内替换上游的内测声明和厂商专属凭据文件，因此该包是预期的合并审查热点。冲突会在进入 `main` 前中止；没有文本冲突的合并仍必须通过完整源码与打包产物检查。不会仅因为没有文本冲突就认定兼容。

## Alternatives considered

**每次定时上游发布都创建拉取请求。** 未采用于自动路径：完整源码聚合检查会在推送前运行，也会在发布时再次运行；合并冲突仍会中止并交由人工处理。冲突或有意的产品边界变更需要审查时，仍可使用拉取请求。

**把源码态 Electron E2E 当作发布冒烟测试。** 未采用：该测试解析未打包的 CLI 路径，无法证明打包依赖闭包、原生输出布局或已签名 helper 行为。

**只使用 `codesign --deep` 完成签名。** 未采用：外层 entitlements 不会传递到 Electron helper。明确从内到外签名，才能让 helper entitlements 可观测且可独立校验。

**在上游工作流的桌面子集检查后直接发布。** 未采用：服务商引导、文档配对、UI Token、replay 行为和其他继承包都可能在不改动桌面外壳测试的情况下回归。

## Consequences

上游发布无法在未通过仓库完整 Linux 检查、UI 静态审计与每个原生 runner 的打包启动检查时，通过自动路径进入 `main` 或 GitHub Releases。Pilot 自身修复可以在不等待上游的情况下获得新版本，但该修订步骤是一次显式的手动发布操作。发布失败会在 `main` 上保留已验证源码，并可重试而无需改写历史。代价是同步与发布之间会重复源码质量检查，原生 job 更长，且上游触及 Pilot 有意的引导 fork 时仍需人工介入。打包冒烟测试能证明启动和内置 runtime 解析，但不会通过操作系统包管理器安装 NSIS、DEB 或 RPM；公证仍与 Developer ID 签名分离。
