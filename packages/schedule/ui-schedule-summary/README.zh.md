# @deepseek-ai/dsh-ui-schedule-summary

[English](README.md) | 中文

这个双面插件在不改变 Schedule 领域的前提下，向 Workspace 的 Session 悬浮摘要贡献活动提醒元数据。Host 半边注册了只允许 loopback 调用的 `/pilot-schedule-summary` Connection RPC 通道。处理器调用 `ctx.sessionPersistence.inspect`，通过 `foldScheduleEvents(events, meta.seedLength ?? 0)` 折叠上游 `schedule/change` 事件流，并且只返回活动数量与最近的 `scheduledAt`。inspect 不会恢复冷 Session；seed 边界也会阻止 fork 显示由 parent 持有的提醒。结果缓存 15 秒，并会合并并发请求；对应的 Schedule 变更会主动使缓存失效。读取时会清理过期项，Session 超过 256 个后会淘汰最久未使用的条目，因此重复悬浮既不会反复扫描完整日志，也不会让内存占用无上限增长。

浏览器半边在 `sidebar.workspaces.session.detail` 中注册一个有序条目。它只会在延迟出现的悬浮卡片挂载期间请求摘要；活动提醒为零或请求失败时省略该行；呈现使用 Workspace owner 提供的可序列化 class 与图标名。因此，本包不会引入独立的卡片样式、颜色、圆角或图标体系。

Pilot Harness 桌面 profile 会组合上游 `@deepseek-ai/dsh-time-context`、`@deepseek-ai/dsh-schedule` 与本呈现条目。使用下面的命令把同一个预构建 bundle 安装到本地 DeepSeek Harness Web profile：

```sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-ui-schedule-summary-0.1.0-rc.5.tgz
```

重启 Web profile，再用 `dsh --profile web --dump-config` 确认 `pilot-schedule-summary`。执行 `dsh plugin --profile web remove @deepseek-ai/dsh-ui-schedule-summary` 即可移除。浏览器必须通过 loopback 连接，并公开 `sidebar.workspaces.session.detail`；Pilot Harness v0.1.0 已包含该契约，较旧的上游版本无法呈现这个可选摘要行。

Schedule 包仍然是持久状态权威与模型工具 owner。停用本插件只会移除侧边栏元数据，不会删除提醒，也不会停用 Schedule 本身。

## 模型体验

无，因为这个只读呈现插件不添加工具、提示词内容、Session 事件或 follow-up 行为；模型可见的提醒工具与交付生命周期仍由 `@deepseek-ai/dsh-schedule` 独立持有。

#### KV Cache 影响

无；本插件从不组装或发送模型请求。

## 已知限制与暂缓事项

- 悬浮摘要只显示活动数量与最近目标，不显示提醒内容或管理操作。
- 持久日志损坏或不可用时会省略可选行；悬浮卡片不会显示 Schedule 诊断。
- 该 RPC 通道会暴露持久化的 Session 元数据，因此有意采用不包含 trusted-host 例外的严格 loopback authority。即使把 LAN origin 加入 Harness 的 `trustedHosts` 设置也不会启用它；远程 Web 客户端需要本插件未提供的独立认证传输层。
- 没有公开 `sidebar.workspaces.session.detail` 的上游 Harness 版本可以加载本包，但无法显示浏览器元数据行；目前该 Slot 契约由 Pilot Harness 提供。
