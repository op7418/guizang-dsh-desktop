# @deepseek-ai/dsh-ui-worktree

[English](README.md) | 中文

Worktree 是一个同时包含 Host 与浏览器两面的 DeepSeek Harness 插件。浏览器半边通过公共 `shell.right-sidebar` Dock，只在“对话”和“轨迹”旁贡献一个 Files 控件和一个全高右侧栏。打开 Files 会增加一列真实布局并收窄对话区，而不会覆盖在对话内容上；左侧栏不再保留重复的 Files 入口。插件卸载时，标题栏控件与右侧栏会一起消失。每个文件和文件夹行都有同一个三点菜单，用于重命名、通过原生应用打开，以及把相对当前 Workspace 的 `@路径` 添加到当前对话草稿。原生打开操作委托给运行时受 loopback 保护的 `host.openPath` 链路，草稿编辑则使用当前 Session 公开的 conversation input 接口；两项操作都不依赖 Electron。Host 半边注册了只允许 loopback 调用的 `/pilot-worktree` Connection RPC 通道，用于列出当前 Workspace、统计递归文件数，以及执行限制在工作区内的新建文件、新建目录和重命名操作；浏览器只接收注入的普通回调，不自行拼接特权 URL。版本控制元数据、依赖目录、平台元数据与符号链接都不会暴露。

插件不依赖 Electron。使用一条命令把预构建 bundle 安装到本地 DeepSeek Harness Web profile：

```sh
dsh plugin --profile web add https://github.com/op7418/guizang-dsh-desktop/releases/latest/download/deepseek-ai-dsh-ui-worktree-0.1.0-rc.5.tgz
```

重启 Web profile，再用 `dsh --profile web --dump-config` 确认 `pilot-worktree`。执行 `dsh plugin --profile web remove @deepseek-ai/dsh-ui-worktree` 即可移除。

Pilot Harness 桌面补丁挂载的是同一条 bundle 配置。桌面外壳只负责原生窗口行为和客户端打包，不拥有文件树业务逻辑。浏览器必须通过 loopback origin 连接，并公开 `conversation.session.header.utilities`、`shell.right-sidebar` 与 `sidebar.workspaces.session.detail`；Pilot Harness v0.1.0 已包含这些契约。较旧的上游版本可以安装 bundle，但无法呈现 Files 控件或右侧栏。

Worktree 还会向 `sidebar.workspaces.session.detail` 贡献当前 Git 分支。该详情请求使用 `summary=branch`，直接读取普通仓库或 linked worktree 的 `.git/HEAD`，并跳过目录枚举与递归统计。游离 HEAD 仓库显示短提交前缀；非 Git Workspace 则省略这一行。

## 模型体验

间接影响，仅来自行内操作添加到用户草稿中的相对 Workspace `@路径`；conversation 包拥有发送与持久化用户消息日志，而 Worktree 不注入隐藏模型上下文，也不添加工具 Schema 或 Session 事件。

#### KV Cache 影响

无；插件不会组装模型请求。

## 已知限制与暂缓事项

- 递归统计在 20,000 个可见文件后停止，并显示为截断计数。
- 单个目录列举在 5,000 项后停止，并明确标记结果已截断，不会无上限地把整个目录缓冲进内存。
- 删除操作因不可逆而有意不提供；目前支持新建文件、新建目录和重命名。
- 可移植名称校验会拒绝 Windows 保留设备名、备用数据流语法、末尾句点及已存在的重命名目标；重命名永远不会覆盖已有条目。
- 原生标题栏拖动和原生目录选择框仍属于桌面外壳能力，普通的纯浏览器 Harness 组合无法获得这些能力。
- 文件 RPC 有意采用不包含 trusted-host 例外的严格 loopback authority。即使把 LAN origin 加入 Harness 的 `trustedHosts` 设置也不会授予远程文件系统访问权限；远程 Web 组合需要本插件未提供的独立认证传输层。
- 没有公开上述三个呈现 Slot 的上游 Harness 版本可以加载本包，但无法显示浏览器 UI；目前这些 Slot 契约由 Pilot Harness 提供。
