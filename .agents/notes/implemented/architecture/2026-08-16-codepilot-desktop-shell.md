# Agent Note: CodePilot desktop shell for the Web profile

Status: implemented

English | [中文](2026-08-16-codepilot-desktop-shell.zh.md)

## Problem

The Web profile exposes the complete Harness plugin composition, but installing Node.js and launching a browser-backed local service makes the product harder to adopt as a daily desktop client. Reimplementing the agent runtime inside a desktop framework would create a second source of truth for sessions, providers, credentials, tools, and plugins.

## Decision

The repository ships an Electron app under [`apps/desktop`](../../../../apps/desktop/README.md) that supervises the built `dsh web` profile as a child process. Electron owns native window behavior, process recovery, a private Harness home, and platform installers. A normal Client plugin owns the CodePilot visual theme. The loopback Web process owns all application behavior and data APIs.

The app consumes the settled URL printed by the Web bundle instead of predicting a port or adding a desktop-only readiness endpoint. Its BrowserWindow accepts navigation only on that URL's loopback origin, keeps Node integration disabled, enables context isolation and sandboxing, and exposes a narrow preload for recovery operations and native directory selection.

Model and provider management remain the composition of `ui-settings-models`, `settings`, `credentials`, and `llm`. The desktop app neither mirrors provider state nor writes provider configuration directly. Runtime-affecting management features continue to enter the composition as DSH plugins.

The settings composition exposes Providers and Models as separate sections. Provider rows and the searchable add-provider card grid resolve known service identities through the shared LobeHub brand icon source, while unknown routes retain a semantic server fallback. The shell-owned General section contains the loopback settings-document action because it is an operational preference, while a separate About section owns product identity, version/runtime details, local diagnostics, and upstream support links.

## Runtime boundary

Development launches the repository's built CLI directly; packaging stages the desktop package's production dependency closure under `.runtime`, then lets electron-builder materialize that closure as application resources. The resources intentionally remain outside asar because DSH profile installation creates operating-system links back to plugin package directories, and links cannot traverse an archive boundary. The desktop package explicitly aggregates the runtime peer providers that a workspace install otherwise makes visible through hoisting. The desktop process launches the CLI with Electron's Node runtime and an app-specific `DSH_HOME`; the existing file settings, credentials, profile patches, and session stores therefore retain their documented formats and lifecycle.

The CodePilot theme is an ordinary Client plugin over public Web tokens and generated CSS-module labels. It owns its stylesheet, product mark, complete light and dark token sets, and the geometry of the sidebar, project tree, composer, messages, settings, menus, dialogs, buttons, and inputs without changing their ownership or business state. The empty conversation, expanded and collapsed sidebar, and About page share one plugin-embedded Pilot Harness mark derived from the approved desktop master. Unloading the plugin removes its stylesheet, embedded mark, and activation marker so the stock Harness theme becomes active again. Native launcher variants keep an 83.6% optical artwork footprint, while the in-app derivative remains edge-to-edge. On macOS the theme reserves the native traffic-light inset for expanded sidebar and settings controls and moves the collapsed rail control below the titlebar; Windows keeps its caption-button inset and titlebar overlay.

The existing `ui-directory-picker-native` plugin remains the owner of the two workspace directory-flow slots. Its injected picker prefers `window.pilotHarness.pickDirectory()` when the isolated Electron preload provides it, then falls back to `ctx.workspaces.pickDirectory()` for ordinary Web deployments. Electron's main process owns the dialog; the workspace plugin still receives only the selected path, cancellation, or error through its existing owner callbacks.

The `ui-worktree` plugin owns the full-height right file tree and each row's three-dot menu. Rename stays on its Workspace-confined plugin endpoint; native file and directory open reuse the runtime's loopback-protected `host.openPath` operation, and Add path to input writes an `@path` through the current Session's public conversation-input service. The browser half therefore imports neither Electron nor host filesystem modules, and unloading the plugin removes the complete file-tree interaction.

The desktop project tree follows CodePilot's direct-selection convention: clicking an inactive project starts or opens its blank session, while the explicit add-project action invokes the native chooser in one click. First-run model onboarding is gated on an existing blank session, so the onboarding mask cannot mount over the cold project picker. A Playwright Electron check runs these paths against an isolated empty Harness home, verifies the macOS sidebar-control geometry, exercises provider selection, and captures the Provider, Model, General, and About settings surfaces.

Tagged releases publish the native macOS, Windows, and Linux installers together with prebuilt tarballs for the CodePilot theme, Worktree Files, Schedule summary, and Session-log export plugins. Each plugin tarball declares `dsh.bundle.patch` and carries its own `cordis.patch.yml`, so a local Web profile installs it through one `dsh plugin --profile web add <release-url>` command rather than a source checkout or handwritten patch. CI installs all four archives into an empty Web profile and verifies their composed row ids before publishing them. The root README therefore leads desktop users to Releases and keeps source-build instructions in its Development section.

## Alternatives considered

**Fork the DSH runtime into CodePilot.** This would provide direct access to the existing Electron infrastructure, but it would duplicate the DSH extension model and require every upstream core change to be translated into another runtime.

**Display the Web UI in an unmanaged webview.** This would package a window but leave installation, startup, port allocation, shutdown, crash recovery, and data location to the user.

**Rebuild the complete Web UI in Next.js.** This would make visual reuse straightforward but would replace the existing client plugin roster with a parallel UI protocol and make new DSH UI plugins unavailable until manually ported.

## Consequences

The desktop client inherits DSH model, provider, plugin, and session behavior without a core fork, and its installers can target macOS, Windows, and Linux. A DSH client-plugin or wire change reaches the desktop through the same Web composition. Native directory selection avoids a second AppleScript process and keeps chooser modality attached to the Electron window. The plugin archives also provide a low-friction path for local Web users without pretending that older upstream clients expose Pilot Harness's newer presentation slots.

The app depends on the Web profile remaining embeddable on loopback and on its settled URL log line. The theme plugin requires visual verification after upstream token or sidebar changes. Native dependencies require installers to be built on their target operating system, and production distribution still requires signing and notarization configuration.
