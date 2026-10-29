import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameLoop } from './useGameLoop'

describe('useGameLoop', () => {
  let frames: Array<(t: number) => void>

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => vi.unstubAllGlobals())

  const tick = (t: number) => frames.shift()!(t)

  it('steps a fixed timestep, passing seconds, and renders once per frame', () => {
    const onUpdate = vi.fn()
    const onRender = vi.fn()
    renderHook(() => useGameLoop({ onUpdate, onRender, targetFPS: 10 })) // 100ms step

    tick(1000) // first frame only seeds the clock
    expect(onUpdate).not.toHaveBeenCalled()

    tick(1250) // 250ms -> two steps, 50ms left over
    expect(onUpdate).toHaveBeenCalledTimes(2)
    expect(onUpdate).toHaveBeenCalledWith(0.1)

    tick(1300) // leftover 50 + 50 -> one more step
    expect(onUpdate).toHaveBeenCalledTimes(3)
    expect(onRender).toHaveBeenCalledTimes(3)
  })

  it('skips update and render while paused but keeps the loop alive', () => {
    const onUpdate = vi.fn()
    const onRender = vi.fn()
    renderHook(() => useGameLoop({ onUpdate, onRender, paused: true }))

    tick(0)
    tick(500)
    expect(onUpdate).not.toHaveBeenCalled()
    expect(onRender).not.toHaveBeenCalled()
    expect(frames).toHaveLength(1)
  })

  it('cancels the pending frame on unmount', () => {
    const { unmount } = renderHook(() => useGameLoop({ onUpdate: vi.fn() }))
    unmount()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })
})
