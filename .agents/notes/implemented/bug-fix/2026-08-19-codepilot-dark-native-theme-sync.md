# Agent Note: Keep the CodePilot dark palette and native shell synchronized

Status: implemented

English | [中文](2026-08-19-codepilot-dark-native-theme-sync.zh.md)

## Problem

The CodePilot stylesheet replaced the complete light semantic palette after the stock Harness theme but supplied only a partial dark override. Forty-two alias, component, and shadow tokens therefore retained light values in dark mode, including Markdown backgrounds, active buttons, scrollbars, input surfaces, and elevation. Electron's native material and caption colors independently followed the operating system, so an explicit application theme could also disagree with the surrounding desktop window.

## Decision

The CodePilot theme defines a dark value for every Pilot color/platform-surface token and every `--dsw-alias-*`, `--dsw-specific-*`, and `--dsw-shadow-*` token that it defines in the light branch. Dark selection and diffuse elevation use the same inverted CodePilot palette, and the tooltip override consumes the dedicated dark-surface token instead of inverting to the light primary button color. macOS rebuilds its translucent sidebar and popover surfaces from the dark body-scoped values instead of inheriting a light value computed on the document root. Both the package test and the UI audit derive the token sets from the stylesheet and reject a missing dark counterpart.

The CodePilot Client plugin depends on the Harness theme service and forwards every selected built-in preference through an optional desktop preload method. A custom registered theme forwards its resolved light or dark scheme. The main process accepts the IPC request only from an allowed renderer, validates the value against `system`, `light`, and `dark`, persists it in the Electron user-data directory, and restores it before creating the first window. Native theme updates refresh the Windows caption overlay and the opaque Windows/Linux backing color. Browser clients have no bridge and remain CSS-only.

## Alternatives considered

**Rely on the stock dark palette for omitted tokens.** Rejected: the CodePilot light selector loads later with equal or greater specificity, so its light values win unless the plugin explicitly replaces them in its dark selector.

**Hide native material disagreement behind an opaque renderer tint.** Rejected: the tint defeats macOS vibrancy and still leaves native caption controls on a different theme.

**Forward only the currently resolved light or dark scheme.** Rejected: converting `system` into an explicit Electron source stops native material from following later operating-system changes. The preference itself remains the source whenever it is one of Electron's built-in values.

## Consequences

Every CodePilot-owned semantic surface changes coherently when the palette changes, and the desktop window starts and continues with the same preference without exposing the bridge to browser clients. The theme package gains a dependency on the Harness theme service, while the desktop IPC surface gains one narrowly validated appearance operation and one non-secret user-data file. Plugin unload stops future forwarding but leaves the current native source intact, which avoids an unrelated palette change during hot reload or reversible presentation teardown.
