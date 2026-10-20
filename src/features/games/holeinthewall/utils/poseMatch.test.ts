import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { PoseLandmark as L } from '@/shared/utils/gestureConstants'
import { jointAngle, matchPose } from './poseMatch'
import { T_POSE } from './poses'

const lm = (x: number, y: number, visibility = 1): NormalizedLandmark => ({ x, y, z: 0, visibility })

/** Square aspect so geometry in tests is exact. */
const ASPECT = 1

/** A front-facing body with both arms lifted `armDeg` above horizontal. */
function body(armDeg: number, opts: { hideRightWrist?: boolean } = {}): NormalizedLandmark[] {
  const out: NormalizedLandmark[] = []
  const shoulderY = 0.3
  out[L.LEFT_SHOULDER] = lm(0.45, shoulderY)
  out[L.RIGHT_SHOULDER] = lm(0.55, shoulderY)
  out[L.LEFT_HIP] = lm(0.46, 0.6)
  out[L.RIGHT_HIP] = lm(0.54, 0.6)
  const rad = (armDeg * Math.PI) / 180
  const len = 0.1
  out[L.LEFT_ELBOW] = lm(0.45 - Math.cos(rad) * len, shoulderY - Math.sin(rad) * len)
  out[L.LEFT_WRIST] = lm(0.45 - Math.cos(rad) * len * 2, shoulderY - Math.sin(rad) * len * 2)
  out[L.RIGHT_ELBOW] = lm(0.55 + Math.cos(rad) * len, shoulderY - Math.sin(rad) * len)
  out[L.RIGHT_WRIST] = lm(
    0.55 + Math.cos(rad) * len * 2,
    shoulderY - Math.sin(rad) * len * 2,
    opts.hideRightWrist ? 0.1 : 1,
  )
  return out
}

describe('jointAngle', () => {
  it('measures a right angle', () => {
    expect(jointAngle(lm(0, 1), lm(0, 0), lm(1, 0), ASPECT)).toBeCloseTo(90)
  })

  it('measures a straight line as 180', () => {
    expect(jointAngle(lm(-1, 0), lm(0, 0), lm(1, 0), ASPECT)).toBeCloseTo(180)
  })

  it('returns 0 for degenerate (zero-length) rays', () => {
    expect(jointAngle(lm(0, 0), lm(0, 0), lm(0, 0), ASPECT)).toBe(0)
  })

  it('corrects for aspect ratio', () => {
    // In pixel space this is dx=1, dy=1 → 45°
    expect(jointAngle(lm(0.75, 0), lm(0, 0), lm(0.75, 1), 4 / 3)).toBeCloseTo(45)
  })
})

describe('matchPose (T-pose)', () => {
  it('matches arms straight out', () => {
    const result = matchPose(body(0), T_POSE, ASPECT)
    expect(result.matched).toBe(true)
    expect(result.score).toBeGreaterThan(0.95)
  })

  it('tolerates small deviations', () => {
    expect(matchPose(body(15), T_POSE, ASPECT).matched).toBe(true)
  })

  it('rejects arms raised well above horizontal', () => {
    const result = matchPose(body(60), T_POSE, ASPECT)
    expect(result.matched).toBe(false)
    expect(result.failing).toContain('left shoulder')
    expect(result.score).toBeLessThan(1)
  })

  it('rejects arms hanging down', () => {
    expect(matchPose(body(-80), T_POSE, ASPECT).matched).toBe(false)
  })

  it('fails joints whose landmarks are not visible', () => {
    const result = matchPose(body(0, { hideRightWrist: true }), T_POSE, ASPECT)
    expect(result.matched).toBe(false)
    expect(result.failing).toEqual(['right elbow'])
  })

  it('does not match when there are no landmarks', () => {
    expect(matchPose(null, T_POSE, ASPECT)).toMatchObject({ matched: false, score: 0 })
  })
})
