import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfileTimer } from './useProfileTimer'

describe('useProfileTimer', () => {
  let frames: Map<number, (t: number) => void>
  let nextId: number

  beforeEach(() => {
    frames = new Map()
    nextId = 1
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      frames.set(nextId, cb)
      return nextId++
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
  })
  afterEach(() => vi.unstubAllGlobals())

  const tick = (t: number) => {
    const [id, cb] = [...frames.entries()][0]
    frames.delete(id)
    act(() => cb(t))
  }

  it('starts idle', () => {
    const { result } = renderHook(() => useProfileTimer({ onComplete: vi.fn() }))
    expect(result.current).toMatchObject({ progress: 0, isActive: false })
  })

  it('reports progress as a percentage of the duration', () => {
    const { result } = renderHook(() => useProfileTimer({ onComplete: vi.fn(), duration: 1000 }))
    act(() => result.current.start())
    expect(result.current.isActive).toBe(true)

    tick(5000) // first frame sets the origin
    tick(5250)
    expect(result.current.progress).toBe(25)
  })

  it('completes exactly once at 100% and goes inactive', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useProfileTimer({ onComplete, duration: 1000 }))
    act(() => result.current.start())

    tick(0)
    tick(2000) // overshoot is clamped
    expect(result.current.progress).toBe(100)
    expect(result.current.isActive).toBe(false)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
  })

  it('reset cancels the running frame and clears state without completing', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useProfileTimer({ onComplete, duration: 1000 }))
    act(() => result.current.start())
    tick(0)
    tick(500)

    act(() => result.current.reset())

    expect(cancelAnimationFrame).toHaveBeenCalled()
    expect(frames.size).toBe(0)
    expect(result.current).toMatchObject({ progress: 0, isActive: false })
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('can be restarted after completing', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useProfileTimer({ onComplete, duration: 100 }))
    act(() => result.current.start())
    tick(0)
    tick(100)
    act(() => result.current.start())
    tick(1000)
    tick(1100)
    expect(onComplete).toHaveBeenCalledTimes(2)
  })

  it('cancels the pending frame on unmount', () => {
    const { result, unmount } = renderHook(() => useProfileTimer({ onComplete: vi.fn() }))
    act(() => result.current.start())
    unmount()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })
})
