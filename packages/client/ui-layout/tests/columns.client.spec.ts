import { describe, expect, it } from 'vitest'
import {
  CENTER_MIN, clampWidth, computeColumns,
  DETAILS_DEFAULT, DETAILS_MIN,
  RIGHT_SIDEBAR_DEFAULT, RIGHT_SIDEBAR_MIN,
  SIDEBAR_COLLAPSED, SIDEBAR_DEFAULT, SIDEBAR_MIN,
} from '@deepseek-ai/dsh-client-ui-layout/src/client/columns.ts'

const open = (width: number) => width
const closed = (_width: number) => 0

describe('clampWidth', () => {
  it('clamps into the range and rounds', () => {
    expect(clampWidth(250.4, 240, 420)).toBe(250)
    expect(clampWidth(100, 240, 420)).toBe(240)
    expect(clampWidth(9999, 240, 420)).toBe(420)
  })
})

describe('computeColumns', () => {
  it('fits all four tracks at their preferred widths', () => {
    const cols = computeColumns(
      1920, open(SIDEBAR_DEFAULT), open(RIGHT_SIDEBAR_DEFAULT), open(DETAILS_DEFAULT),
    )
    expect(cols).toEqual({
      sidebar: 280,
      center: 1920 - 280 - 320 - 360,
      rightSidebar: 320,
      details: 360,
    })
  })

  it('closed panels contribute zero while the closed sidebar keeps its rail', () => {
    expect(computeColumns(1920, closed(300), closed(320), closed(360))).toEqual({
      sidebar: SIDEBAR_COLLAPSED,
      center: 1920 - SIDEBAR_COLLAPSED,
      rightSidebar: 0,
      details: 0,
    })
  })

  it('clamps all open preferences before solving', () => {
    const cols = computeColumns(2400, open(9999), open(1), open(1))
    expect(cols).toMatchObject({ sidebar: 420, rightSidebar: RIGHT_SIDEBAR_MIN, details: DETAILS_MIN })
    expect(computeColumns(1920, open(1), closed(320), open(DETAILS_DEFAULT)).sidebar).toBe(SIDEBAR_MIN)
  })

  it('shrinks details before closing it', () => {
    const cols = computeColumns(1570, open(280), open(320), open(360))
    expect(cols).toEqual({ sidebar: 280, center: CENTER_MIN, rightSidebar: 320, details: 330 })
  })

  it('closes details before shrinking the docked workspace tool', () => {
    const cols = computeColumns(1250, open(280), open(320), open(360))
    expect(cols).toEqual({ sidebar: 280, center: 650, rightSidebar: 320, details: 0 })
  })

  it('shrinks the dock only after details has closed', () => {
    const cols = computeColumns(1200, open(280), open(320), open(360))
    expect(cols).toEqual({ sidebar: 280, center: CENTER_MIN, rightSidebar: 280, details: 0 })
  })

  it('derives a closed dock when its minimum would starve center', () => {
    const cols = computeColumns(1100, open(280), open(320), open(360))
    expect(cols).toEqual({ sidebar: 280, center: 820, rightSidebar: 0, details: 0 })
  })

  it('never concedes the sidebar and gives center the final remainder', () => {
    const cols = computeColumns(700, open(SIDEBAR_DEFAULT), closed(320), closed(DETAILS_DEFAULT))
    expect(cols).toEqual({ sidebar: SIDEBAR_DEFAULT, center: 420, rightSidebar: 0, details: 0 })
  })

  it('recovers both preferred right tracks after re-widening without rewriting preferences', () => {
    const squeezed = computeColumns(1100, open(280), open(320), open(360))
    expect(squeezed).toMatchObject({ rightSidebar: 0, details: 0 })
    const restored = computeColumns(1920, open(280), open(320), open(360))
    expect(restored).toMatchObject({ rightSidebar: 320, details: 360 })
  })

  it('handles a tiny viewport with all optional panels derived closed', () => {
    expect(computeColumns(400, open(280), open(320), open(360))).toEqual({
      sidebar: 280, center: 120, rightSidebar: 0, details: 0,
    })
  })
})
