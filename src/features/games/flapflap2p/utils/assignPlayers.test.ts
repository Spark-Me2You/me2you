import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { PoseLandmark } from '@/shared/utils/gestureConstants'
import { assignPosesToPlayers } from './assignPlayers'

const point = (x: number): NormalizedLandmark => ({ x, y: 0.5, z: 0, visibility: 1 })

/** A pose with only the landmarks assignPlayers reads. */
function pose({ left, right, nose }: { left?: number; right?: number; nose?: number }): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = []
  if (nose !== undefined) landmarks[PoseLandmark.NOSE] = point(nose)
  if (left !== undefined) landmarks[PoseLandmark.LEFT_SHOULDER] = point(left)
  if (right !== undefined) landmarks[PoseLandmark.RIGHT_SHOULDER] = point(right)
  return landmarks
}

describe('assignPosesToPlayers', () => {
  it('returns no players when there are no poses', () => {
    expect(assignPosesToPlayers([])).toEqual({ P1: null, P2: null })
  })

  it('assigns by mirrored camera half: raw x >= split is P1, below is P2', () => {
    const p1 = pose({ left: 0.7, right: 0.8 })
    const p2 = pose({ left: 0.2, right: 0.3 })
    expect(assignPosesToPlayers([p1, p2])).toEqual({ P1: p1, P2: p2 })
  })

  it('falls back to the nose when shoulders are missing', () => {
    const p2 = pose({ nose: 0.1 })
    expect(assignPosesToPlayers([p2])).toEqual({ P1: null, P2: p2 })
  })

  it('skips poses with no usable landmarks', () => {
    expect(assignPosesToPlayers([pose({})])).toEqual({ P1: null, P2: null })
  })

  it('picks the person closest to the camera (widest shoulders) on a crowded side', () => {
    const far = pose({ left: 0.6, right: 0.65 })
    const near = pose({ left: 0.6, right: 0.9 })
    expect(assignPosesToPlayers([far, near]).P1).toBe(near)
    expect(assignPosesToPlayers([near, far]).P1).toBe(near)
  })
})
