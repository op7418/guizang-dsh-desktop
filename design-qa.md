# Design QA — collapsed rail brand icon

- Source visual truth: `/Users/op7418/Downloads/ScreenShot_2026-08-17_224654_662.png`
- Implementation screenshot: `/tmp/pilot-harness-sidebar-icon-fixed.png`
- Hover screenshot: `/tmp/pilot-harness-sidebar-icon-hover.png`
- Full-view comparison: `/tmp/pilot-harness-sidebar-icon-comparison.png`
- Focused comparison: `/tmp/pilot-harness-sidebar-icon-focus-comparison.png`
- State: light theme, collapsed sidebar, empty conversation; normal and Hover states checked.
- Viewport: source and implementation are both `844 × 664` pixels at an `844 × 664` CSS viewport.
- Density normalization: none required; both evidence images have identical pixel dimensions.
- Browser-rendered evidence: implementation captured from the fixed desktop composition at `http://127.0.0.1:55321/` in the Codex in-app Browser.
- Console check: no browser console error was introduced during the normal/Hover checks.

## Findings and comparison history

### Iteration 1 — blocked

- [P1] The collapsed rail rendered two product marks in one 36px control.
  - Evidence: the source screenshot shows the new Pilot Harness raster mark followed by the legacy black fish mark. DOM inspection found that `FishLogo` accepted `data-pilot-sidebar-rail-icon` at the call site but dropped it before rendering the root SVG, so the CodePilot theme selector could not hide the legacy mark.
  - Impact: the product identity looked duplicated and overflowed the rail control.
  - Fix: `FishLogo` now forwards native SVG data, ARIA, and event attributes to its root SVG; the existing theme selector can therefore hide the legacy mark without changing the reversible non-CodePilot fallback.

### Iteration 2 — passed

- Normal-state runtime evidence:
  - rail control: `36 × 36` CSS px;
  - Pilot Harness pseudo-element: `22 × 22` CSS px and visible;
  - legacy fish SVG: `display: none`, `0 × 0` layout box;
  - panel-toggle SVG: `display: none`, `0 × 0` layout box.
- Hover-state runtime evidence:
  - Pilot Harness pseudo-element: `display: none`;
  - legacy fish SVG: still `display: none`;
  - panel-toggle SVG: one visible `16 × 16` glyph.
- The focused side-by-side comparison shows one centered brand mark after the fix. No actionable P0, P1, or P2 mismatch remains in the requested region.

## Required fidelity surfaces

- Fonts and typography: unchanged; the fix only affects SVG attribute forwarding.
- Spacing and layout rhythm: the existing 36px rail hit area and icon centerline are unchanged; removing the extra inline SVG restores the intended single-icon spacing.
- Colors and visual tokens: unchanged; the Pilot Harness brand asset and existing Hover background token remain authoritative.
- Image quality and asset fidelity: the supplied Pilot Harness raster mark remains the only normal-state brand image; no placeholder, CSS drawing, emoji, or replacement asset was introduced.
- Copy and content: unchanged.

## Primary interactions tested

- Collapsed rail normal state shows only the Pilot Harness application mark.
- Hovering the mark swaps it to the sidebar-expand glyph and shows the existing tooltip.
- The new-session, add-workspace, search, and settings controls remain visible in the rail.

## Follow-up polish

No P3 follow-up is required for the reported overlap.

final result: passed
