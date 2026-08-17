# `@deepseek-ai/dsh-client-ui-codepilot-theme`

English | [中文](README.zh.md)

An ordinary DeepSeek Harness Client plugin that applies the CodePilot visual language without replacing Harness state or interaction logic.

The plugin owns its stylesheet and an activation marker. Unloading or disabling the plugin removes both, allowing the stock Harness theme to take over again. Desktop-only title-bar adjustments remain gated by the desktop preload attributes; the design tokens and component styling also work in a browser Harness client.

The plugin also owns the Pilot Harness product mark used by the empty conversation, expanded and collapsed sidebar, and About page. Its generated data URL travels inside the client bundle, so the brand does not depend on an Electron asset URL and disappears with the rest of the theme when the plugin unloads. Native launcher icons are generated separately with platform optical padding; in-app marks use the edge-to-edge derivative so they retain their intended component size. In the collapsed rail, the brand toggle occupies the same centered 36px control slot as Chat, Add Workspace, and Search.

## Installation

Install the prebuilt bundle into a local DeepSeek Harness Web profile:

```sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-client-ui-codepilot-theme-0.1.0-rc.5.tgz
```

Restart the Web profile, then confirm `codepilot-theme` with `dsh --profile web --dump-config`. Remove the package with `dsh plugin --profile web remove @deepseek-ai/dsh-client-ui-codepilot-theme` to restore the stock presentation.

## Model Experience

None, as this browser-side visual theme registers no model-facing context, tool, event, or request content.

#### KV Cache effect

None; loading or unloading the theme changes only client presentation.

## Known Limitations and Deferred Work

- The generated brand stylesheet must be refreshed with `pnpm --filter @deepseek-ai/dsh-desktop run icons` whenever `apps/desktop/assets/icon-master.png` changes.
- Brand seats use explicit `data-pilot-brand-mark` presentation hooks. New upstream brand locations require a hook and a visual audit before the theme can replace them reversibly.
