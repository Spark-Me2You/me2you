import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { PoseLandmark } from '@/shared/utils/gestureConstants'
import { assignPosesToPlayers } from './assignPlayers'

const point = (x: number): NormalizedLandmark => ({ x, y: 0.5, z: 0, visibility: 1 })

function pose({ left, right, nose }: { left?: number; right?: number; nose?: number }): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = []
  if (nose !== undefined) landmarks[PoseLandmark.NOSE] = point(nose)
  if (left !== undefined) landmarks[PoseLandmark.LEFT_SHOULDER] = point(left)
  if (right !== undefined) landmarks[PoseLandmark.RIGHT_SHOULDER] = point(right)
  return landmarks
}

const EMPTY = { P1: null, P2: null, P3: null, P4: null }

describe('assignPosesToPlayers (4P)', () => {
  it('returns no players when there are no poses', () => {
    expect(assignPosesToPlayers([])).toEqual(EMPTY)
  })

  it('maps each strip, mirrored: highest raw x is P1, lowest is P4', () => {
    const p1 = pose({ left: 0.85, right: 0.9 })
    const p2 = pose({ left: 0.6, right: 0.65 })
    const p3 = pose({ left: 0.35, right: 0.4 })
    const p4 = pose({ left: 0.1, right: 0.15 })
    expect(assignPosesToPlayers([p4, p2, p1, p3])).toEqual({ P1: p1, P2: p2, P3: p3, P4: p4 })
  })

  it('puts exact boundaries in the strip on their higher-x side', () => {
    const at75 = pose({ nose: 0.75 })
    const at50 = pose({ nose: 0.5 })
    const at25 = pose({ nose: 0.25 })
    const below25 = pose({ nose: 0.2499 })
    expect(assignPosesToPlayers([at75]).P1).toBe(at75)
    expect(assignPosesToPlayers([at50]).P2).toBe(at50)
    expect(assignPosesToPlayers([at25]).P3).toBe(at25)
    expect(assignPosesToPlayers([below25]).P4).toBe(below25)
  })

  it('picks the closest person (widest shoulders) when two share a strip', () => {
    const far = pose({ left: 0.55, right: 0.6 })
    const near = pose({ left: 0.52, right: 0.72 })
    expect(assignPosesToPlayers([far, near]).P2).toBe(near)
    expect(assignPosesToPlayers([near, far]).P2).toBe(near)
  })

  it('leaves empty strips null', () => {
    const p3 = pose({ left: 0.3, right: 0.4 })
    expect(assignPosesToPlayers([p3])).toEqual({ ...EMPTY, P3: p3 })
  })

  it('falls back to the nose when shoulders are missing, and skips unusable poses', () => {
    const p4 = pose({ nose: 0.1 })
    expect(assignPosesToPlayers([p4, pose({})])).toEqual({ ...EMPTY, P4: p4 })
  })
})
