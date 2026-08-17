# Agent Note: Harden Pilot Harness plugin and desktop boundaries

Status: implemented

English | [中文](2026-08-17-pilot-harness-boundary-hardening.zh.md)

## Problem

Pilot Harness had accumulated product-facing extensions without one complete boundary review. Two presentation plugins exposed exact HTTP routes outside the Connection trust fence, the shipped default model could name a disabled provider, file rename could overwrite a destination, repeated reminder hovers scanned the persisted log, and the third layout column lived outside the shell's width solver. The desktop launcher also staged a second dependency tree, assumed one non-macOS titlebar strategy, and used POSIX child termination on Windows. These seams made plugin disablement incomplete, upgrades harder to reason about, and Windows/Linux behavior materially different from macOS.

## Decision

Plugin-owned Host operations use named Connection RPC channels with `authority: 'loopback'`; browser components receive injected load/mutate callbacks and never construct privileged URLs. Worktree canonicalizes every path under the selected Workspace, rejects links and non-portable names, caps enumeration, and refuses an existing rename destination. Schedule summaries use a short invalidating cache with in-flight coalescing. Blank sessions whose saved default is unroutable adopt the first usable catalog model, while sessions with logged request history keep their historical selection.

The shell owns four explicit columns—navigation, conversation, right sidebar, and details—and one concession solver. Details concedes first, then the right sidebar; navigation never concedes. The desktop package consumes the collected Harness dependency closure directly, disables HMR in the shipped patch, uses native Linux chrome, Windows overlay chrome, platform-native process-tree shutdown, and a native-platform CI matrix. Theme-sensitive product text remains localized markup, with stable semantic `data-pilot-*` hooks instead of CSS-generated English for the migrated surfaces.

## Alternatives considered

**Keep exact same-origin HTTP routes.** Rejected: same-origin is not the Connection authority policy, and an independently registered route can bypass the loopback and trusted-host checks that protect privileged capabilities.

**Stage another DSH runtime before packaging.** Rejected: a second closure adds drift and makes the source and packaged launch paths exercise different dependency graphs.

**Let the Files plugin size itself outside AppFrame.** Rejected: independently sized columns can squeeze conversation below its minimum and leave the left rail overlapping content; width ownership belongs to the shell.

## Consequences

Disabling the Worktree or Schedule presentation plugin removes its UI and RPC registration without leaving a privileged route behind. File operations fail closed across macOS, Windows, and Linux naming rules. Reminder hover cost is bounded for unchanged sessions, and a disabled provider no longer becomes the effective default for a new blank session. Desktop artifacts are produced on their native operating systems; macOS remains the locally exercised runtime, while Windows and Linux gain blocking build/package tests and still require native release smoke testing for shell integration. The remaining legacy theme selectors can be migrated incrementally to semantic hooks without changing localized content.
