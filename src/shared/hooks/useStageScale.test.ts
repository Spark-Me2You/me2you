import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useStageScale } from './useStageScale'

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

describe('useStageScale', () => {
  afterEach(() => setViewport(1024, 768))

  it('fits the stage by its tighter axis', () => {
    setViewport(1536, 1080)
    const { result } = renderHook(() => useStageScale())
    expect(result.current).toBeCloseTo(0.8)
  })

  it('updates on resize', () => {
    setViewport(1920, 1080)
    const { result } = renderHook(() => useStageScale())
    expect(result.current).toBe(1)
    act(() => {
      setViewport(1920, 540)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe(0.5)
  })
})
