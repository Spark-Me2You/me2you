import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInterval } from './useInterval'

describe('useInterval', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('calls the callback every delay ms', () => {
    const cb = vi.fn()
    renderHook(() => useInterval(cb, 100))
    vi.advanceTimersByTime(350)
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('does not run when delay is null', () => {
    const cb = vi.fn()
    renderHook(() => useInterval(cb, null))
    vi.advanceTimersByTime(1000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('uses the latest callback without resetting the timer', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ cb }) => useInterval(cb, 100), { initialProps: { cb: first } })
    vi.advanceTimersByTime(50)
    rerender({ cb: second })
    vi.advanceTimersByTime(50)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops on unmount', () => {
    const cb = vi.fn()
    const { unmount } = renderHook(() => useInterval(cb, 100))
    unmount()
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
  })
})
