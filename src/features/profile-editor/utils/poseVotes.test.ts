import { describe, expect, it } from 'vitest'
import { pickPose, type PoseSample } from './poseVotes'

const at = (category: PoseSample['category'], t: number): PoseSample => ({ category, at: t })

describe('pickPose', () => {
  it('returns the most frequent pose in the window', () => {
    const samples = [at('wave', 0), at('peace_sign', 100), at('peace_sign', 200), at('peace_sign', 300), at('wave', 400)]
    expect(pickPose(samples, 0, 400)).toBe('peace_sign')
  })

  it('only counts samples inside the window', () => {
    const samples = [at('wave', 0), at('wave', 100), at('wave', 200), at('thumbs_up', 900), at('thumbs_up', 1000)]
    expect(pickPose(samples, 800, 1000)).toBe('thumbs_up')
  })

  it('needs at least two frames of a pose', () => {
    expect(pickPose([at('wave', 0)], 0, 100)).toBeNull()
  })

  it('needs the pose in a meaningful share of frames', () => {
    const samples = [at('wave', 0), at('wave', 10), ...Array.from({ length: 8 }, (_, i) => at(null, 20 + i))]
    expect(pickPose(samples, 0, 100)).toBeNull()
  })

  it('returns null with no samples or no poses', () => {
    expect(pickPose([], 0, 100)).toBeNull()
    expect(pickPose([at(null, 0), at(null, 50)], 0, 100)).toBeNull()
  })
})
