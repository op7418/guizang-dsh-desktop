# Agent Note: CodePilot theme plugin and UI token pass

Status: implemented

English | [中文](2026-08-16-codepilot-theme-plugin-and-ui-token-pass.zh.md)

## Problem

Desktop presentation had accumulated in the Electron shell and in unrelated component styles. This made the CodePilot skin hard to disable, left component radii and text colors inconsistent, exposed upstream model-provider catalog entries that were not part of the CodePilot product, and kept conversation statistics outside their intended Context surface.

## Decision

CodePilot presentation is owned by `@deepseek-ai/dsh-client-ui-codepilot-theme`, an ordinary Harness Client plugin mounted by the desktop profile. The plugin owns its stylesheet and activation marker. Loading applies the CodePilot token layer; unloading restores the previous marker and removes the plugin stylesheet, allowing the stock Harness presentation to become active without changing core session, provider, or tool behavior.

The visual system uses two geometry tiers: 8px for interactive controls and 14px for surfaces. Text maps to four semantic levels, while cards, popovers, inputs, borders, focus rings, and platform materials use shared tokens. The home and settings navigation columns use the same continuous sidebar material through the macOS traffic-light area. The collapsed rail locks the product mark, Chat, Add Workspace, and Search to one centered 36px control line; action glyphs remain 16px with 4px spacing. The composer Workspace selector uses a 14px glyph, a 13px/20px label, and 6px internal gaps without leaking button padding into the label. The empty conversation, sidebar brand seats, and About page use one plugin-embedded Pilot Harness mark; native launcher assets use a separate optically inset derivative. Platform-specific title-bar rules remain gated by Electron preload attributes, so the theme can also run in an ordinary browser Harness client.

Conversation composition keeps Workspace and Mode controls in the footer, but projects token, cache, timing, turn, and step details into the persistent Context popover. The Worktree plugin contributes its sole Files control to the session-header utility slot beside Chat and Trajectory, and renders the file tree through the additive `shell.right-sidebar` dock. Opening Files adds a full-height layout column that narrows the conversation instead of floating over it; the left sidebar has no duplicate action. The session header no longer draws a decorative divider.

Provider and model settings project the installed Harness provider routes through a CodePilot catalog boundary. Unsupported upstream built-ins, including Azure-style routes and the unusable Anthropic catalog default, are excluded from the UI while explicitly installed external provider plugins remain discoverable. The desktop multi-provider adapter starts dormant, so models enter selectors only after a real provider is connected. Known routes resolve through the shared provider-brand icon component; unknown plugin routes keep the semantic fallback.

Beautiful UI patterns are adapted at the component level for the prompt bar, Context card, reasoning disclosure, tool chips, code blocks, search results, and Worktree navigation. Harness slots and stores remain the state boundary; demo runtimes and autoplay behavior are not imported.

## Alternatives considered

**Keep injecting the full theme from Electron.** This would hide presentation ownership from the Harness plugin inventory and make browser use or independent unloading impossible.

**Fork the settings and conversation screens.** This would provide complete markup control, but would duplicate Harness state, slots, and interaction behavior and make upstream UI plugins harder to consume.

**Expose every upstream provider route.** This would mirror the raw provider registry, but would present unsupported CodePilot choices and preserve Azure-style catalog noise. The selected boundary keeps explicitly installed external plugins discoverable without treating every upstream built-in as a product default.

## Consequences

The theme appears in the standard plugin inventory and can be disabled independently of feature plugins. Disabling the theme restores Harness styling but intentionally leaves separately enabled features, such as Worktree and Context composition, operational. Returning to the complete stock surface requires disabling those feature plugins as well or selecting a stock profile.

Upstream Harness core updates remain consumable because the implementation does not fork the runtime. Public slot or generated-style changes still require the UI audit to be rerun. The desktop E2E audit records the theme lifecycle, provider catalog, header geometry, native drag regions, platform insets, collapsed-rail icon rhythm, Workspace selector alignment, Worktree right-sidebar geometry, Context popover, settings surfaces, and Trajectory layout at a fixed viewport.

## Verification

- CodePilot UI coverage: 80/80 checks.
- Beautiful UI adoption: 16/16 checks.
- Desktop Electron E2E, client tests, host tests, type checks, and production builds pass.
- The current right-sidebar screenshot and runtime evidence live under `docs/audits/2026-08-17-right-sidebar`; the broader pre-change, post-change, and side-by-side set remains under `docs/audits/2026-08-16-ui-token-pass`.
- The collapsed-rail and Workspace-selector pixel audit, focused before/after comparison, and passing design QA live under `docs/audits/2026-08-17-icon-rhythm` and `design-qa.md`.
