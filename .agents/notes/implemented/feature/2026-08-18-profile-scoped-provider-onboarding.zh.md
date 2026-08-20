# Agent Note: 不显示官方声明的 profile 级服务商引导

Status: implemented

[English](2026-08-18-profile-scoped-provider-onboarding.md) | 中文

## Problem

上游 GUI 首次使用流程把官方内测声明与 DeepSeek 专属凭据引导放在一起。Pilot Harness 不应呈现该官方声明，一个支持多种服务商的客户端也不能在用户选择路由之前偏向某一厂商。替代后的服务商引导最初使用一个按 origin 共享的 `localStorage` key 记录跳过，因此在一个 Harness 设置 profile 中跳过，会同时屏蔽同一 origin 下的其他 profile。

## Decision

`ui-settings-models` 持有一个不绑定厂商的引导条目，并与服务商页共用同一份服务商与凭据联接快照。只有当没有已配置且可用的服务商时才显示该引导；它会等待发现过程与现有对话框结束，并提供两个明确操作：打开服务商设置，或跳过。任一操作都会立即关闭引导。文案只描述缺少模型服务商，不会声称服务商可用就必然能获得非空的远程模型目录。

同一插件的 Host 部分会注册 `pilot-provider-onboarding` 设置 namespace，其中只有一个可选的 `dismissed` 布尔值。客户端通过 `SettingsScope` 绑定该 namespace；打开服务商页或跳过都会向当前 Harness 设置 profile 写入 `dismissed: true`。同时挂载的多个引导界面共享同一 scope，另一个 profile 则保留自己的首次使用状态。只读设置或失败的设置/服务商 join 不会阻断浏览。

上游内测声明、版本存储和 DeepSeek 专属引导组件继续保持缺席。本决策取代 [共用弹窗的产品引导](2026-08-13-shared-modal-product-onboarding.md) 中的当前呈现与确认机制，也取代 [版本化 GUI 欢迎引导](2026-07-30-versioned-gui-welcome-onboarding.md) 中恢复欢迎引导的部分。原有全屏声明与遥测文案仍按 [移除首次启动内测声明](../simplification/2026-08-13-remove-first-run-beta-notice.md) 保持删除。

## 上游归属边界

该产品行为会有意替换 `packages/client/ui-settings-models` 中的上游源码，而不是在其上叠加第二个同时显示的引导条目。被移除的欢迎引导、DeepSeek 引导、store、文案及其浏览器/单元测试因此是明确的 Pilot fork 边界。上游对 `settings.onboarding`、`ui-settings-models` 或 `ui-settings-general` 的改动，即使 Git 显示无冲突，也必须进行语义审查；[上游与发布门禁](../process/2026-08-19-pilot-upstream-and-desktop-release-gates.md) 持有该边界周围的自动验证。

## Alternatives considered

**在 Pilot 服务商引导之前保留官方声明。** 未采用：上游内测声明描述的是另一个产品的发布状态，而且会在用户查看客户端之前引入强制摩擦。

**在引导中保留 DeepSeek 专属 API key 编辑器。** 未采用：服务商管理已支持多类路由，首次使用引导只需把用户带到这个完整界面。

**把跳过状态持久化到浏览器 `localStorage`。** 未采用：origin 不是设置身份。共享同一服务器 origin 或桌面 renderer 的多个 profile 不应共享引导确认状态。

**要求至少有一条模型目录数据才完成引导。** 未采用：目录列举属于建议性信息，可能在明确配置的服务商/模型路由仍可用时短暂失败。引导与 README 会说明更窄的服务商就绪规则。

## Consequences

Pilot Harness 启动时不会显示官方内测声明，未配置服务商时也仍然可以浏览。跳过操作会在恰好一个设置 profile 中跨重载和应用重启保留，之后仍可进入服务商设置。该插件增加 Host 侧 settings 依赖，不再是纯展示包。有意的源码替换会提高上游引导相关的合并审查成本，但其行为由 Host 注册、React scope 共享、就绪判定与完整 GUI 测试覆盖，不再依赖未隔离的浏览器 key。
