import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DRAWABLE_WORDS } from '../config/drawableWords'
import { useDailyWord } from './useDailyWord'

describe('useDailyWord', () => {
  afterEach(() => vi.useRealTimers())

  it('returns a word from the list with today\'s date key', () => {
    vi.useFakeTimers({ now: new Date(2026, 5, 1, 12) })
    const { result } = renderHook(() => useDailyWord())
    expect(DRAWABLE_WORDS).toContain(result.current.word)
    expect(result.current.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is stable for a given day', () => {
    vi.useFakeTimers({ now: new Date(2026, 5, 1, 9) })
    const a = renderHook(() => useDailyWord()).result.current
    vi.setSystemTime(new Date(2026, 5, 1, 21))
    const b = renderHook(() => useDailyWord()).result.current
    expect(b).toEqual(a)
  })
})
