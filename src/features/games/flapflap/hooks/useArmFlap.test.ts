import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PoseLandmark } from '@/shared/utils/gestureConstants'
import { useArmFlap } from './useArmFlap'

type Wrist = { y: number; visibility?: number }

function pose(left: Wrist, right: Wrist) {
  const landmarks: unknown[] = []
  landmarks[PoseLandmark.LEFT_WRIST] = { x: 0, ...left }
  landmarks[PoseLandmark.RIGHT_WRIST] = { x: 1, ...right }
  return landmarks as never
}

describe('useArmFlap', () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }))
  afterEach(() => vi.useRealTimers())

  const options = { bufferSize: 2, velocityThreshold: 0.1, cooldownMs: 200 }

  // Buffer of 2 -> velocity = (newest - oldest) / 2
  function feed(result: { current: ReturnType<typeof useArmFlap> }, frames: Array<[Wrist, Wrist]>) {
    for (const [l, r] of frames) act(() => result.current.processLandmarks(pose(l, r)))
  }

  it('does nothing until the buffer fills', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))
    feed(result, [[{ y: 0 }, { y: 0 }]])
    expect(onFlap).not.toHaveBeenCalled()
  })

  it('fires a left flap when only the left wrist drops fast', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))
    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }]])

    expect(onFlap).toHaveBeenCalledTimes(1)
    expect(onFlap).toHaveBeenCalledWith({ arm: 'left', velocity: 0.25, timestamp: 1_000_000 })
  })

  it('reports both arms and right arm', () => {
    const arms: string[] = []
    const onFlap = vi.fn((e) => arms.push(e.arm))
    const { result } = renderHook(() => useArmFlap({ ...options, cooldownMs: 0, onFlap }))

    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0 }, { y: 0.5 }]])
    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0 }, { y: 0 }]]) // release
    feed(result, [[{ y: 0.5 }, { y: 0.5 }]])

    expect(arms).toEqual(['right', 'both'])
  })

  it('ignores upward and slow movement', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))
    feed(result, [[{ y: 0.5 }, { y: 0.5 }], [{ y: 0.3 }, { y: 0.3 }], [{ y: 0.29 }, { y: 0.29 }]])
    expect(onFlap).not.toHaveBeenCalled()
  })

  it('needs the wrist to release before the next flap (rising edge)', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, cooldownMs: 0, onFlap }))

    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }], [{ y: 1 }, { y: 0 }]]) // keeps dropping
    expect(onFlap).toHaveBeenCalledTimes(1)

    feed(result, [[{ y: 1 }, { y: 0 }], [{ y: 1 }, { y: 0 }]]) // stop
    feed(result, [[{ y: 1.5 }, { y: 0 }]]) // new flap
    expect(onFlap).toHaveBeenCalledTimes(2)
  })

  it('enforces the cooldown between flaps', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))

    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }]])
    feed(result, [[{ y: 1 }, { y: 0 }]]) // second flap, still inside cooldown
    expect(onFlap).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(250)
    feed(result, [[{ y: 0.5 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }], [{ y: 1 }, { y: 0 }]])
    expect(onFlap).toHaveBeenCalledTimes(2)
  })

  it('ignores a low-visibility wrist and bails when both are hidden', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))
    feed(result, [
      [{ y: 0, visibility: 0.1 }, { y: 0, visibility: 0.1 }],
      [{ y: 0.5, visibility: 0.1 }, { y: 0.5, visibility: 0.1 }],
    ])
    expect(onFlap).not.toHaveBeenCalled()

    feed(result, [[{ y: 0, visibility: 0.1 }, { y: 0 }], [{ y: 0.5, visibility: 0.1 }, { y: 0 }]])
    expect(onFlap).not.toHaveBeenCalled() // hidden left drop doesn't count
  })

  it('reset clears stale samples so re-entry does not produce a phantom flap', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))
    feed(result, [[{ y: 0 }, { y: 0 }]]) // last sample before the player leaves
    act(() => result.current.reset())
    // Player re-enters with hands lower down; without reset this diffs against y=0.
    feed(result, [[{ y: 0.6 }, { y: 0.6 }]])
    expect(onFlap).not.toHaveBeenCalled()
  })

  it('without reset the same re-entry is a false flap (guards the test above)', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, onFlap }))
    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0.6 }, { y: 0.6 }]])
    expect(onFlap).toHaveBeenCalledTimes(1)
  })

  it('reset clears the held-signal latch so the next flap fires', () => {
    const onFlap = vi.fn()
    const { result } = renderHook(() => useArmFlap({ ...options, cooldownMs: 0, onFlap }))
    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }]])
    expect(onFlap).toHaveBeenCalledTimes(1)
    act(() => result.current.reset())
    feed(result, [[{ y: 0 }, { y: 0 }], [{ y: 0.5 }, { y: 0 }]])
    expect(onFlap).toHaveBeenCalledTimes(2)
  })
})
