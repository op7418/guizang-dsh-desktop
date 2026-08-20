# `@deepseek-ai/dsh-client-ui-codepilot-theme`

[English](README.md) | 中文

这是一个普通的 DeepSeek Harness Client 插件：它只应用 CodePilot 的视觉语言，不替换 Harness 的状态与交互逻辑。

样式表和启用标记都由插件自行管理。插件被卸载或停用时，两者会一起清理，界面会重新使用 Harness 原始主题。浅色与深色分支定义完全相同的 Pilot 颜色/平台表面，以及 Harness 语义、组件和阴影 Token 集合，因此加载顺序更靠后的插件样式不会让浅色文字、侧栏材质、Markdown、控件、滚动条或阴影值残留在深色界面中。桌面标题栏适配仍由桌面 preload 标记限定，设计 Token 与组件样式也可以用于浏览器版 Harness。

在桌面客户端中，本插件还会通过可选的 preload 桥接同步所选的 `system`、`light` 或 `dark` 偏好。Electron 原生材质、非透明窗口背板和 Windows 标题栏按钮会与应用内主题保持一致。主进程只接受 Electron 支持的三种主题来源；普通浏览器不存在该桥接，只应用相同的 CSS 样式，不会与桌面逻辑耦合。

空会话、展开与折叠侧边栏以及“关于”页使用的 Pilot Harness 产品图标也由本插件管理。生成后的 data URL 会随 Client bundle 一起分发，不依赖 Electron 资源路径，并会在插件卸载时随主题一起消失。系统启动器图标会另行加入平台光学校准留白；应用内标识使用铺满画布的派生资源，因此不会因 Dock 的留白规则而在组件中显得过小。侧边栏收起时，品牌按钮与“对话”“添加工作区”和“搜索”共用同一条水平中心线和 36px 控件槽位。

## 安装

把预构建 bundle 安装到本地 DeepSeek Harness Web profile：

```sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-client-ui-codepilot-theme-0.1.0-rc.5.tgz
```

重启 Web profile，再用 `dsh --profile web --dump-config` 确认 `codepilot-theme`。执行 `dsh plugin --profile web remove @deepseek-ai/dsh-client-ui-codepilot-theme` 即可移除本包并恢复原始界面。

## 模型体验

无。这个浏览器端视觉主题不注册任何面向模型的上下文、工具、事件或请求内容。

#### KV Cache 影响

无；加载或卸载主题只会改变客户端表现层。

## 已知限制与待办

- 每次修改 `apps/desktop/assets/icon-master.png` 后，都必须运行 `pnpm --filter @deepseek-ai/dsh-desktop run icons` 刷新生成后的品牌样式表。
- 品牌位置依赖显式的 `data-pilot-brand-mark` 表现层挂钩。上游新增品牌位置时，需要先补充挂钩并完成视觉审计，主题才能以可逆方式替换它。
