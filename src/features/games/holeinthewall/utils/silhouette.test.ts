import { describe, expect, it } from 'vitest'
import { A_POSE, HANDS_UP, STAR, T_POSE } from './poses'
import { figureShapes, rowIntervals, subtractIntervals } from './silhouette'

const H = 600
const row = (pose: typeof T_POSE, y: number, grow = 0) =>
  rowIntervals(figureShapes(pose.figure, H), 0, y, grow, -500, 500, 2)

const covers = (intervals: [number, number][], x: number) =>
  intervals.some(([a, b]) => x >= a && x < b)

describe('figureShapes / rowIntervals', () => {
  it('T-pose spreads the arms out sideways at shoulder height', () => {
    const shoulderRow = row(T_POSE, -H / 2 + 0.2 * H)
    expect(covers(shoulderRow, -0.3 * H)).toBe(true)
    expect(covers(shoulderRow, 0.3 * H)).toBe(true)
  })

  it('T-pose has no arms low on the body', () => {
    const lowRow = row(T_POSE, H * 0.2)
    expect(covers(lowRow, -0.3 * H)).toBe(false)
    expect(covers(lowRow, 0.3 * H)).toBe(false)
  })

  it('hands-up puts the arms above the shoulders', () => {
    const aboveHead = row(HANDS_UP, -H / 2 + 0.05 * H)
    expect(covers(aboveHead, -0.07 * H)).toBe(true)
    expect(covers(row(T_POSE, -H / 2 + 0.05 * H), -0.07 * H)).toBe(false)
  })

  it('star spreads the legs; feet together keeps them narrow', () => {
    const ankleRow = H / 2 - 0.02 * H
    const star = row(STAR, ankleRow)
    const together = row(A_POSE, ankleRow)
    const width = (iv: [number, number][]) => iv[iv.length - 1][1] - iv[0][0]
    expect(width(star)).toBeGreaterThan(width(together) * 2)
  })

  it('mirrors left and right arms around the center', () => {
    const shoulderRow = row(A_POSE, -H / 2 + 0.3 * H)
    const first = shoulderRow[0][0]
    const last = shoulderRow[shoulderRow.length - 1][1]
    expect(Math.abs(first + last)).toBeLessThan(4)
  })

  it('growing the radius widens the hole', () => {
    const plain = row(T_POSE, 0)
    const grown = row(T_POSE, 0, 12)
    expect(grown[0][0]).toBeLessThan(plain[0][0])
  })
})

describe('subtractIntervals', () => {
  it('cuts holes out of a span', () => {
    expect(subtractIntervals([[0, 100]], [[20, 30], [60, 70]])).toEqual([
      [0, 20],
      [30, 60],
      [70, 100],
    ])
  })

  it('handles holes touching the edges and empty holes', () => {
    expect(subtractIntervals([[0, 100]], [[0, 10], [90, 100]])).toEqual([[10, 90]])
    expect(subtractIntervals([[0, 100]], [])).toEqual([[0, 100]])
  })
})
