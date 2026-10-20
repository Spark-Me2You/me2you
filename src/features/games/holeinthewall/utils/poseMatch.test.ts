import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { PoseLandmark as L } from '@/shared/utils/gestureConstants'
import { isFullBodyInFrame } from './bodyCheck'
import { jointAngle, matchPose } from './poseMatch'
import { bodyFromFigure } from './poseFixtures'
import { POSES, STAR, T_POSE } from './poses'

const lm = (x: number, y: number, visibility = 1): NormalizedLandmark => ({ x, y, z: 0, visibility })

/** Square aspect so geometry in tests is exact. */
const ASPECT = 1

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

describe('matchPose', () => {
  it('matches a body striking each pose, with a near-perfect score', () => {
    for (const pose of POSES) {
      const result = matchPose(bodyFromFigure(pose.figure), pose, ASPECT)
      expect(result.failing, pose.id).toEqual([])
      expect(result.matched, pose.id).toBe(true)
      expect(result.score, pose.id).toBeGreaterThan(0.95)
    }
  })

  it('never matches a body striking a different pose', () => {
    for (const body of POSES) {
      for (const target of POSES) {
        if (body === target) continue
        const result = matchPose(bodyFromFigure(body.figure), target, ASPECT)
        expect(result.matched, `${body.id} should not match ${target.id}`).toBe(false)
      }
    }
  })

  it('tolerates small deviations', () => {
    const figure = { ...T_POSE.figure, leftArm: 105 }
    expect(matchPose(bodyFromFigure(figure), T_POSE, ASPECT).matched).toBe(true)
  })

  it('names the arm that is out of position', () => {
    const figure = { ...T_POSE.figure, leftArm: 150 }
    const result = matchPose(bodyFromFigure(figure), T_POSE, ASPECT)
    expect(result.matched).toBe(false)
    expect(result.failing).toContain('left shoulder')
    expect(result.failing).not.toContain('right shoulder')
  })

  it('rejects arms hanging down', () => {
    const figure = { ...T_POSE.figure, leftArm: 10, rightArm: 10 }
    expect(matchPose(bodyFromFigure(figure), T_POSE, ASPECT).matched).toBe(false)
  })

  it('checks the legs: feet together fails the star, a star fails the T-pose', () => {
    const together = matchPose(bodyFromFigure({ ...STAR.figure, legSpread: 0 }), STAR, ASPECT)
    expect(together.failing).toEqual(['left leg', 'right leg'])

    const spread = matchPose(bodyFromFigure({ ...T_POSE.figure, legSpread: 25 }), T_POSE, ASPECT)
    expect(spread.failing).toEqual(['left leg', 'right leg'])
  })

  it('checks bent knees', () => {
    const body = bodyFromFigure(T_POSE.figure)
    body[L.LEFT_ANKLE] = lm(body[L.LEFT_KNEE].x + 0.15, body[L.LEFT_KNEE].y)
    expect(matchPose(body, T_POSE, ASPECT).failing).toContain('left knee')
  })

  it('fails joints whose landmarks are not visible', () => {
    const body = bodyFromFigure(T_POSE.figure)
    body[L.RIGHT_WRIST] = lm(body[L.RIGHT_WRIST].x, body[L.RIGHT_WRIST].y, 0.1)
    const result = matchPose(body, T_POSE, ASPECT)
    expect(result.matched).toBe(false)
    expect(result.failing).toEqual(['right elbow'])
  })

  it('does not match when there are no landmarks', () => {
    expect(matchPose(null, T_POSE, ASPECT)).toMatchObject({ matched: false, score: 0 })
  })
})

describe('isFullBodyInFrame', () => {
  const full = () => bodyFromFigure(T_POSE.figure)

  it('accepts a head-to-toe body inside the frame', () => {
    expect(isFullBodyInFrame(full())).toBe(true)
  })

  it('rejects no detection', () => {
    expect(isFullBodyInFrame(null)).toBe(false)
  })

  it('rejects a body with low-visibility legs', () => {
    const body = full()
    body[L.LEFT_ANKLE] = lm(body[L.LEFT_ANKLE].x, body[L.LEFT_ANKLE].y, 0.2)
    expect(isFullBodyInFrame(body)).toBe(false)
  })

  it('rejects a body with a joint outside the frame', () => {
    const body = full()
    body[L.RIGHT_ANKLE] = lm(0.55, 1.05)
    expect(isFullBodyInFrame(body)).toBe(false)
  })

  it('rejects a body missing landmarks entirely', () => {
    const body = full()
    delete body[L.LEFT_KNEE]
    expect(isFullBodyInFrame(body)).toBe(false)
  })
})
