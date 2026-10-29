import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessionStorage } from './useSessionStorage'

describe('useSessionStorage', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('falls back to the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useSessionStorage('key', { n: 1 }))
    expect(result.current[0]).toEqual({ n: 1 })
  })

  it('reads an existing stored value', () => {
    sessionStorage.setItem('key', JSON.stringify({ n: 2 }))
    const { result } = renderHook(() => useSessionStorage('key', { n: 1 }))
    expect(result.current[0]).toEqual({ n: 2 })
  })

  it('updates state and persists to sessionStorage', () => {
    const { result } = renderHook(() => useSessionStorage('key', 0))
    act(() => result.current[1](5))
    expect(result.current[0]).toBe(5)
    expect(sessionStorage.getItem('key')).toBe('5')
  })

  it('falls back to the initial value when stored JSON is invalid', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sessionStorage.setItem('key', '{not json')
    const { result } = renderHook(() => useSessionStorage('key', 'fallback'))
    expect(result.current[0]).toBe('fallback')
    expect(console.error).toHaveBeenCalled()
  })
})
