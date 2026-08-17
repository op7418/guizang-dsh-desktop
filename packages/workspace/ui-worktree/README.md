# @deepseek-ai/dsh-ui-worktree

English | [中文](README.zh.md)

Worktree is a dual-face DeepSeek Harness plugin. Its browser half contributes one Files control beside the Conversation and Trajectory tabs and one full-height right sidebar through the public `shell.right-sidebar` dock. Opening Files adds a real layout column and narrows the conversation surface; it does not float above the transcript. The left sidebar deliberately contains no duplicate Files action. The header control and right sidebar disappear together when the plugin is unloaded. Every file and folder row has one shared three-dot menu for rename, native open, and adding its Workspace-relative `@path` to the current conversation draft. Native open delegates to the runtime's loopback-protected `host.openPath` path, while draft edits use the current Session's public conversation-input face; neither action depends on Electron. Its Host half registers the loopback-authorized `/pilot-worktree` Connection RPC channel to list the selected Workspace, report its recursive file count, and perform workspace-confined file creation, directory creation, and rename operations. The browser receives plain injected callbacks rather than constructing privileged URLs. VCS metadata, dependency trees, platform metadata, and symbolic links are not exposed.

The plugin contains no Electron dependency. Install its prebuilt bundle into a local DeepSeek Harness Web profile with one command:

```sh
dsh plugin --profile web add https://github.com/op7418/guizang-dsh-desktop/releases/latest/download/deepseek-ai-dsh-ui-worktree-0.1.0-rc.5.tgz
```

Restart the Web profile, then confirm `pilot-worktree` with `dsh --profile web --dump-config`. Remove it with `dsh plugin --profile web remove @deepseek-ai/dsh-ui-worktree`.

The Pilot Harness desktop patch mounts that same bundle row. The desktop shell only supplies native window behavior and packaging; it does not own the file-tree business logic. The browser must connect through a loopback origin and expose `conversation.session.header.utilities`, `shell.right-sidebar`, and `sidebar.workspaces.session.detail`; Pilot Harness v0.1.0 includes those contracts. An older upstream release can install the bundle but cannot render the Files control or sidebar.

Worktree also contributes the current Git branch to `sidebar.workspaces.session.detail`. That detail request uses `summary=branch`, reads `.git/HEAD` directly for ordinary repositories and linked worktrees, and skips directory enumeration and recursive counting. Detached repositories show the short commit prefix; non-Git Workspaces omit the row.

## Model Experience

Indirectly, through the unsent Workspace-relative `@path` that the row action adds to the human draft; the conversation package owns sending and durable user-message logging, while Worktree injects no hidden model context and adds no tool schemas or Session events.

#### KV Cache effect

None; the plugin does not assemble model requests.

## Known Limitations and Deferred Work

- The recursive count stops after 20,000 visible files and reports a truncated count.
- One directory listing stops after 5,000 entries and reports that the result is truncated instead of buffering an unbounded directory.
- Delete is intentionally absent because it is irreversible; create and rename are the supported directory operations.
- Portable-name validation rejects Windows reserved device names, alternate-data-stream syntax, trailing dots, and rename destinations that already exist; rename never overwrites an existing entry.
- Native titlebar dragging and native directory dialogs remain desktop-shell capabilities and are not available to an ordinary browser-only Harness composition.
- The file RPC deliberately uses the strict loopback authority with no trusted-host exceptions. Adding a LAN origin to the Harness `trustedHosts` setting does not grant remote filesystem access; a remote Web composition needs a separate authenticated transport that this plugin does not provide.
- Upstream Harness releases without the three presentation slots listed above can load the package but cannot display its browser UI; Pilot Harness currently supplies those slot contracts.
