import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { PoseLandmark } from '@/shared/utils/gestureConstants'
import { assignPosesToZones, getZoneForX } from './playerZones'

const point = (x: number): NormalizedLandmark => ({ x, y: 0.5, z: 0, visibility: 1 })

/** A pose with only the landmarks playerZones reads. */
function pose({ left, right, nose }: { left?: number; right?: number; nose?: number }): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = []
  if (nose !== undefined) landmarks[PoseLandmark.NOSE] = point(nose)
  if (left !== undefined) landmarks[PoseLandmark.LEFT_SHOULDER] = point(left)
  if (right !== undefined) landmarks[PoseLandmark.RIGHT_SHOULDER] = point(right)
  return landmarks
}

describe('getZoneForX', () => {
  it('numbers zones from the left of the mirrored screen', () => {
    expect(getZoneForX(0.7, 2)).toBe(0)
    expect(getZoneForX(0.2, 2)).toBe(1)
  })

  it('puts a landmark on a split in the zone further left on screen', () => {
    expect(getZoneForX(0.5, 2)).toBe(0)
    expect(getZoneForX(0.75, 4)).toBe(0)
    expect(getZoneForX(0.5, 4)).toBe(1)
    expect(getZoneForX(0.25, 4)).toBe(2)
    expect(getZoneForX(0.1, 4)).toBe(3)
  })

  it('clamps landmarks outside the frame', () => {
    expect(getZoneForX(1, 2)).toBe(0)
    expect(getZoneForX(1.2, 2)).toBe(0)
    expect(getZoneForX(-0.2, 2)).toBe(1)
  })

  it('always returns zone 0 for a single zone', () => {
    expect(getZoneForX(0, 1)).toBe(0)
    expect(getZoneForX(0.9, 1)).toBe(0)
  })
})

describe('assignPosesToZones', () => {
  it('returns one empty entry per zone when there are no poses', () => {
    expect(assignPosesToZones([], 3)).toEqual([null, null, null])
  })

  it('assigns each pose to its zone', () => {
    const p1 = pose({ left: 0.7, right: 0.8 })
    const p2 = pose({ left: 0.2, right: 0.3 })
    expect(assignPosesToZones([p2, p1], 2)).toEqual([p1, p2])
  })

  it('falls back to the nose when shoulders are missing', () => {
    const p2 = pose({ nose: 0.1 })
    expect(assignPosesToZones([p2], 2)).toEqual([null, p2])
  })

  it('skips poses with no usable landmarks', () => {
    expect(assignPosesToZones([pose({})], 2)).toEqual([null, null])
  })

  it('picks the person closest to the camera on a crowded zone', () => {
    const far = pose({ left: 0.6, right: 0.65 })
    const near = pose({ left: 0.6, right: 0.9 })
    expect(assignPosesToZones([far, near], 2)[0]).toBe(near)
    expect(assignPosesToZones([near, far], 2)[0]).toBe(near)
  })
})
