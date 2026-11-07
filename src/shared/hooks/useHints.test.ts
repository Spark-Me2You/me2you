import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HINT_FADE_OUT_MS, useHints } from './useHints'

const HINT = { id: 'hold', text: 'hold your pose!', durationMs: 1000 }

describe('useHints', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows a hint, fades it out, then removes it', () => {
    const { result } = renderHook(() => useHints())
    act(() => result.current.showHint(HINT))
    expect(result.current.hint).toEqual({ id: 'hold', text: 'hold your pose!', leaving: false })

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.hint?.leaving).toBe(true)

    act(() => vi.advanceTimersByTime(HINT_FADE_OUT_MS))
    expect(result.current.hint).toBeNull()
  })

  it('shows each id only once', () => {
    const { result } = renderHook(() => useHints())
    act(() => result.current.showHint(HINT))
    act(() => vi.advanceTimersByTime(1000 + HINT_FADE_OUT_MS))
    act(() => result.current.showHint(HINT))
    expect(result.current.hint).toBeNull()
  })

  it('replaces the current hint and keeps the new one for its full duration', () => {
    const { result } = renderHook(() => useHints())
    act(() => result.current.showHint(HINT))
    act(() => vi.advanceTimersByTime(800))
    act(() => result.current.showHint({ id: 'other', text: 'next', durationMs: 1000 }))
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.hint).toEqual({ id: 'other', text: 'next', leaving: false })
  })

  it('dismissHint hides immediately', () => {
    const { result } = renderHook(() => useHints())
    act(() => result.current.showHint(HINT))
    act(() => result.current.dismissHint())
    expect(result.current.hint).toBeNull()
  })
})
