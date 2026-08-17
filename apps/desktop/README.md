# Pilot Harness desktop

English | [中文](README.zh.md)

Pilot Harness is a CodePilot-style desktop distribution of DeepSeek Harness. Electron owns the native window, local runtime lifecycle, recovery page, desktop theme, and installers; the DeepSeek Harness plugin tree remains the application runtime.

## Architecture

The desktop process starts the built `@deepseek-ai/dsh` CLI on an operating-system-assigned loopback port, waits for its settled `dsh web:` URL, and loads that URL in a sandboxed BrowserWindow. It gives the child a private `DSH_HOME` under the Electron user-data directory, preserves a bounded redacted diagnostic tail, and restarts the child without restarting the desktop process.

The Web UI remains the DSH browser composition documented in the [Harness architecture](../../docs/architecture.md). The desktop stylesheet supplies a complete light/dark token palette plus component-level geometry for the shell, sidebar, workspace tree, conversation composer, settings, menus, and dialogs. It does not patch the agent loop, session log, tool pipeline, LLM adapters, or Web RPC implementation.

Project selection stays in the existing `ui-directory-picker-native` plugin. In the desktop environment that plugin uses the isolated preload's native folder dialog; ordinary Web deployments continue through the Host directory-picker provider.

## Model, provider, and plugin management

The Models page is the existing `@deepseek-ai/dsh-client-ui-settings-models` plugin. Provider profiles flow through `ctx.settings`, API keys flow through `ctx.credentials`, and live model routes flow through `ctx.llm`; custom OpenAI-compatible providers therefore remain ordinary DSH plugin configuration rather than desktop-owned records.

The Plugins settings pages are also assembled from the DSH client and host plugin roster. A future management feature that changes runtime behavior belongs in a DSH plugin and patch layer; a desktop-only concern such as menus, window recovery, or packaging belongs in this app.

## Development

From the repository root:

```sh
pnpm install
pnpm run desktop:dev
```

`desktop:dev` builds the DSH host and Web artifacts, uses the repository CLI directly, builds the Electron main and preload bundles, and launches the client. Packaged builds use the same declared `@deepseek-ai/dsh` dependency closure collected by electron-builder; there is no second staged runtime.

Run the focused desktop checks with:

```sh
pnpm run desktop:test
pnpm --filter @deepseek-ai/dsh-desktop run typecheck
pnpm --filter @deepseek-ai/dsh-desktop run test:e2e
```

The Electron end-to-end check starts with an isolated empty Harness home, selects two real directories through the preload/IPC path, switches projects from the sidebar, and opens Models/provider management. First-run model onboarding begins only after a project has been accepted, so it cannot mask and intercept the initial directory picker. The command waits for animated geometry to settle, writes a runtime UI artifact, and runs the token, radius, alignment, settings, model, Worktree, and Trajectory audit as a blocking second stage. It also removes an inherited `ELECTRON_RUN_AS_NODE` value before launching Electron so IDE-hosted terminals cannot silently turn the GUI run into a Node process.

## Packaging

Build an unsigned installer for the current operating system with:

```sh
pnpm run desktop:pack
```

The electron-builder matrix defines DMG/ZIP for macOS, NSIS for Windows, and AppImage/DEB/RPM for Linux. The `desktop.yml` workflow builds each target and runs the same blocking Electron flow on its native GitHub runner; Linux uses Xvfb, while macOS and Windows use their native runner sessions. Release signing, notarization, and update publishing remain deployment responsibilities.

The approved square artwork remains in `assets/icon-master.png`. `pnpm --filter @deepseek-ai/dsh-desktop run icons` derives platform PNG, ICNS, ICO, and Linux variants with an 83.6% optical artwork footprint for native launchers, plus an edge-to-edge `brand-icon.png` for in-app surfaces. The same generator embeds a compact copy in the unloadable CodePilot theme, keeping the Dock, recovery page, empty conversation, sidebar, About page, packaged application, and installers on one source image without applying the native launcher inset inside the UI.

## Security and data

The renderer has context isolation, sandboxing, and Node integration disabled. Top-level navigation stays on the active loopback origin, new HTTP(S) windows open in the system browser, and browser permission requests are denied by default. The preload exposes only native folder selection, restart, data-folder, diagnostics-copy, platform, and version operations.

The default Harness data directory is the app-specific Electron user-data folder. `PILOT_HARNESS_DSH_HOME` overrides it for development or managed deployments, and `PILOT_HARNESS_DSH_ENTRY` selects another built DSH CLI entry.

## Known limitations

- The desktop theme follows the current DSH public token names and explicit `data-pilot-*` component hooks for geometry. It no longer selects generated CSS-module class names, but upstream slot or DOM-contract changes still require a visual regression pass.
- The first implementation uses the DSH file-backed credential provider. An OS-keychain credential plugin is the appropriate follow-up when same-user agent processes must not be able to read stored keys.
- Installers are unsigned until a release pipeline supplies platform identities and notarization credentials.
- macOS has also been exercised locally; macOS, Windows, and Linux are build- and Electron-flow-checked on native CI runners, while release candidates still require installation, native-window, signing, and update smoke checks on the target desktop environment.
