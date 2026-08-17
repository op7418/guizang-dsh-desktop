<p align="center">
  <img src="apps/desktop/assets/brand-icon.png" width="112" height="112" alt="Pilot Harness icon">
</p>

<h1 align="center">Pilot Harness</h1>

English | [中文](README.zh.md)

<p align="center"><strong>A CodePilot-inspired desktop client and plugin suite for DeepSeek Harness.</strong></p>

<p align="center">Run the DeepSeek Harness plugin runtime as a focused native app, manage providers and multimodal models visually, and keep desktop additions isolated as ordinary Harness plugins.</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#use-the-plugins-independently">Plugins</a> ·
  <a href="apps/desktop/README.md">Architecture</a> ·
  <a href="LICENSE">MIT License</a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-171717">
  <img alt="Platforms: macOS, Windows, Linux" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-171717">
  <img alt="DeepSeek Harness plugin suite" src="https://img.shields.io/badge/DeepSeek%20Harness-plugin%20suite-4f6ef7">
</p>

## Why Pilot Harness

DeepSeek Harness has a powerful “everything is a plugin” architecture, but its default experience is designed around a CLI-launched Web UI. Pilot Harness keeps that runtime model and adds the parts expected from a daily desktop product:

- **A real desktop app** — Electron packages the local Harness runtime for macOS, Windows, and Linux, owns native window behavior, and provides a recovery screen when startup needs attention.
- **A calmer CodePilot-inspired interface** — consistent tokens, radii, menus, hover states, settings cards, Markdown, conversation/trajectory navigation, and platform-aware title bars.
- **Provider and model management** — connect supported providers, declare an OpenAI-compatible endpoint, manage credentials separately from settings, browse the live model catalog, and identify image-capable models.
- **Workspace context without clutter** — project-aware conversation rows show branch, state, reminder summary, mode, and model details, while Files opens as a true right sidebar.
- **Plugin-first extensions** — the theme, Worktree sidebar, Schedule summary, and Session-log export remain Cordis/DeepSeek Harness rows rather than desktop-only business logic.
- **Reversible customization** — disabling the CodePilot theme row removes its product mark and visual overrides so the stock Harness presentation can take over again.

Pilot Harness does not replace the DeepSeek Harness agent loop, Session log, tool pipeline, provider contracts, or RPC implementation. Electron owns packaging and native integration; the composed Harness plugin tree remains the application runtime.

## Quick Start

<p align="center"><a href="https://github.com/op7418/pilot-harness/releases/latest"><strong>Download Pilot Harness</strong></a></p>

Download the installer for your system from [GitHub Releases](https://github.com/op7418/pilot-harness/releases/latest):

| Platform | Download |
|---|---|
| macOS (Apple Silicon) | [DMG installer](https://github.com/op7418/pilot-harness/releases/latest/download/Pilot-Harness-macOS-arm64.dmg) · [ZIP app](https://github.com/op7418/pilot-harness/releases/latest/download/Pilot-Harness-macOS-arm64.zip) |
| Windows (x64) | [EXE installer](https://github.com/op7418/pilot-harness/releases/latest/download/Pilot-Harness-Windows-x64.exe) |
| Linux (x64) | [AppImage](https://github.com/op7418/pilot-harness/releases/latest/download/Pilot-Harness-Linux-x86_64.AppImage) · [DEB](https://github.com/op7418/pilot-harness/releases/latest/download/Pilot-Harness-Linux-amd64.deb) · [RPM](https://github.com/op7418/pilot-harness/releases/latest/download/Pilot-Harness-Linux-x86_64.rpm) |

After installation, open Pilot Harness, select a Workspace, then go to **Settings → Providers** to connect a provider and choose one of its available models. No separate DeepSeek Harness installation is required for the desktop app.

Preview installers are currently unsigned, so the operating system may ask you to confirm the first launch. Source setup and packaging instructions live in [Development](#development), not in the user installation path.

## What is included

| Area | What Pilot Harness adds | Ownership |
|---|---|---|
| Desktop shell | Native window, local runtime lifecycle, directory dialog, recovery, installers, and platform icons | Electron app |
| Visual system | CodePilot-inspired design tokens and component contracts | <code>@deepseek-ai/dsh-client-ui-codepilot-theme</code> |
| Workspace Files | Right sidebar, file count, branch summary, row actions, and <code>@path</code> insertion | <code>@deepseek-ai/dsh-ui-worktree</code> |
| Reminder summary | Active reminder count and nearest scheduled time in Session hover details | <code>@deepseek-ai/dsh-ui-schedule-summary</code> |
| Session export | Per-Session ZIP export from the Trajectory toolbar and <code>/export</code> | <code>@deepseek-ai/dsh-session-log-export</code> |
| Providers and models | Configurable adapter, credential/settings UI, live catalog, and multimodal labels | Existing Harness plugins plus the Pilot Harness desktop profile |

The provider/model experience is deliberately a **profile composition**, not a new provider implementation. It mounts existing adapter, Settings, and Credentials contracts, then replaces the desktop placeholder only after a real provider advertises a usable model.

## Use the plugins independently

The desktop client already includes every plugin below. If you use a local DeepSeek Harness Web profile instead, install only the feature you want with one command; each release asset is a prebuilt <code>dsh.bundle</code>, so no repository clone, YAML patch, or local build is required.

### CodePilot theme

~~~sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-client-ui-codepilot-theme-0.1.0-rc.5.tgz
~~~

Applies the Pilot Harness visual system and product mark. Removing the plugin restores the stock Harness presentation. See [theme details](packages/client/ui-codepilot-theme/README.md).

### Files sidebar

~~~sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-ui-worktree-0.1.0-rc.5.tgz
~~~

Adds the Workspace-confined right file sidebar, file count, branch summary, row actions, and <code>@path</code> insertion. See [Files plugin details](packages/workspace/ui-worktree/README.md).

### Reminder summary

~~~sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-ui-schedule-summary-0.1.0-rc.5.tgz
~~~

Adds active-reminder metadata to Session hover details while the upstream Schedule plugin remains the reminder authority. See [reminder plugin details](packages/schedule/ui-schedule-summary/README.md).

### Session-log export

~~~sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-session-log-export-0.1.0-rc.5.tgz
~~~

Adds per-Session ZIP export to the **Trajectory** toolbar and the <code>/export</code> command. See [export plugin details](packages/session-query/session-log-export/README.md).

Restart the Web profile after installation and use <code>dsh --profile web --dump-config</code> to confirm the added row. Files and Reminder summary require the Pilot Harness UI slot contracts included in Pilot Harness v0.1.0; older upstream Harness builds can install their bundles but cannot render those two UI contributions.

Remove a plugin with the same package name shown in its details page, for example:

~~~sh
dsh plugin --profile web remove @deepseek-ai/dsh-ui-worktree
~~~

<a id="development"></a>

## Development

~~~sh
git clone https://github.com/op7418/pilot-harness.git
cd pilot-harness
pnpm install
pnpm run desktop:dev
~~~

Build an installer or run the desktop checks with:

~~~sh
pnpm run desktop:pack
pnpm run desktop:test
pnpm --filter @deepseek-ai/dsh-desktop run typecheck
pnpm --filter @deepseek-ai/dsh-desktop run test:e2e
~~~

The native CI matrix builds, tests, exercises the Electron flow, and packages on macOS, Windows, and Linux. Release candidates still need installation, title-bar, signing, notarization, and update checks on target machines.

For the underlying system, read the [DeepSeek Harness architecture](docs/architecture.md), [development guide](docs/development.md), and [desktop architecture](apps/desktop/README.md).

## Upstream, attribution, and trademark notice

Pilot Harness is an independent community project derived from the MIT-licensed [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and visually inspired by [CodePilot](https://github.com/op7418/CodePilot). It is not an official DeepSeek product and is not endorsed by or affiliated with DeepSeek. “DeepSeek”, “DeepSeek Harness”, and “CodePilot” remain the property of their respective owners.

## License

Pilot Harness is available under the [MIT License](LICENSE). Third-party software and licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
