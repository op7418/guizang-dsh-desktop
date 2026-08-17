/**
 * Pure concession-chain column solver for the four-column AppFrame.
 * Chain order is fixed by contract: keep center >= CENTER_MIN by shrinking
 * details, then auto-closing it (derived zero width — preferred width
 * preferences are never rewritten, so widening the window restores them).
 * The sidebar never concedes: its rendered width is always the drag
 * preference (or the collapsed rail), and center absorbs any remaining
 * deficit as the last resort. Inputs are the layout store's plain width
 * preferences (0 = closed); a closed sidebar resolves to the fixed
 * SIDEBAR_COLLAPSED control rail while closed details resolve to zero width.
 * The SIDEBAR_AUTO_COLLAPSE breakpoint is consumed by AppFrame, which decides
 * the effective sidebar preference before solving; the solver itself stays
 * breakpoint-free.
 */

/** Resolved widths for one frame; center may drop below CENTER_MIN only at the final fallback. */
export interface Columns { sidebar: number; center: number; rightSidebar: number; details: number }

// Contract-frozen geometry: the three-column concession chain's fixed points.
/** Center column floor; only the final fallback may go below it. */
export const CENTER_MIN = 640
/** Sidebar drag clamp floor. */
export const SIDEBAR_MIN = 240
/** Sidebar drag clamp ceiling. */
export const SIDEBAR_MAX = 420
/** Sidebar width before any user drag. */
export const SIDEBAR_DEFAULT = 280
/** Closed-sidebar rail: a 24px icon column between 16px horizontal paddings. */
export const SIDEBAR_COLLAPSED = 56
/** Viewport width below which the sidebar auto-collapses to the rail (deepsuite
 * LG breakpoint); a manual toggle below it re-expands over the squeezed center
 * (stores.ts narrowExpanded). */
export const SIDEBAR_AUTO_COLLAPSE = 1024
/** Docked workspace-tool clamp floor. */
export const RIGHT_SIDEBAR_MIN = 240
/** Docked workspace-tool clamp ceiling. */
export const RIGHT_SIDEBAR_MAX = 400
/** Docked workspace-tool width before any future resize affordance. */
export const RIGHT_SIDEBAR_DEFAULT = 320
/** Details drag clamp floor. */
export const DETAILS_MIN = 300
/** Details drag clamp ceiling. */
export const DETAILS_MAX = 520
/** Details width before any user drag. */
export const DETAILS_DEFAULT = 360

/**
 * Clamp a panel width into its contract range.
 * @param px - requested width.
 * @param min - range lower bound.
 * @param max - range upper bound.
 * @returns the clamped width.
 */
export function clampWidth(px: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(px)))
}

/**
 * Solve the three column widths for one viewport frame. Pure: no hysteresis —
 * the output is a function of (viewport, preferences) only, so recovery on
 * re-widening is automatic. Preferences re-clamp here because they cross the
 * store boundary and callers may still supply stale ranges.
 * @param viewport - available frame width in px.
 * @param sidebar - sidebar width preference in px (0 = closed).
 * @param rightSidebar - docked workspace-tool width preference in px (0 = closed).
 * @param details - details width preference in px (0 = closed).
 * @returns resolved widths; details 0 means visually closed (never unmounted), while a closed sidebar keeps its compact rail.
 */
export function computeColumns(
  viewport: number,
  sidebar: number,
  rightSidebar: number,
  details: number,
): Columns {
  // The sidebar is fixed at its preference (or the rail) — it never concedes.
  const s = sidebar === 0 ? SIDEBAR_COLLAPSED : clampWidth(sidebar, SIDEBAR_MIN, SIDEBAR_MAX)
  const r0 = rightSidebar === 0 ? 0 : clampWidth(rightSidebar, RIGHT_SIDEBAR_MIN, RIGHT_SIDEBAR_MAX)
  const d0 = details === 0 ? 0 : clampWidth(details, DETAILS_MIN, DETAILS_MAX)

  // Step 1: everything fits at preferred widths.
  if (s + r0 + d0 + CENTER_MIN <= viewport) {
    return { sidebar: s, center: viewport - s - r0 - d0, rightSidebar: r0, details: d0 }
  }

  // Step 2: shrink details toward its minimum.
  const d1 = d0 === 0 ? 0 : Math.max(DETAILS_MIN, viewport - s - r0 - CENTER_MIN)
  if (s + r0 + d1 + CENTER_MIN <= viewport) {
    return { sidebar: s, center: CENTER_MIN, rightSidebar: r0, details: d1 }
  }

  // Step 3: auto-close details (derived — preferences untouched).
  if (s + r0 + CENTER_MIN <= viewport) {
    return { sidebar: s, center: viewport - s - r0, rightSidebar: r0, details: 0 }
  }

  // Step 4: shrink the docked workspace tool only after details has closed.
  const r1 = r0 === 0 ? 0 : Math.max(RIGHT_SIDEBAR_MIN, viewport - s - CENTER_MIN)
  if (s + r1 + CENTER_MIN <= viewport) {
    return { sidebar: s, center: CENTER_MIN, rightSidebar: r1, details: 0 }
  }

  // Step 5: auto-close the docked tool. The sidebar never concedes; center
  // absorbs any final deficit and may fall below CENTER_MIN.
  return { sidebar: s, center: Math.max(0, viewport - s), rightSidebar: 0, details: 0 }
}
