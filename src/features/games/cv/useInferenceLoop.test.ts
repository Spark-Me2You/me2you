import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInferenceLoop } from './useInferenceLoop'

vi.mock('@/core/cv/mediapipe-loader', () => ({ createPoseLandmarker: vi.fn() }))

const video = { videoWidth: 640, videoHeight: 480, readyState: 4 } as HTMLVideoElement

describe('useInferenceLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls detect with the video on every interval', () => {
    const detect = vi.fn()
    renderHook(() => useInferenceLoop({ videoRef: { current: video }, detect, intervalMs: 50 }))

    vi.advanceTimersByTime(150)

    expect(detect).toHaveBeenCalledTimes(3)
    expect(detect).toHaveBeenCalledWith(video, expect.any(Number))
  })

  it('does not run until enabled', () => {
    const detect = vi.fn()
    const videoRef = { current: video }
    const { rerender } = renderHook(
      ({ enabled }) => useInferenceLoop({ videoRef, detect, enabled, intervalMs: 50 }),
      { initialProps: { enabled: false } },
    )

    vi.advanceTimersByTime(200)
    expect(detect).not.toHaveBeenCalled()

    rerender({ enabled: true })
    vi.advanceTimersByTime(50)
    expect(detect).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['is missing', null],
    ['has no dimensions', { ...video, videoWidth: 0 } as HTMLVideoElement],
    ['has no frame yet', { ...video, readyState: 1 } as HTMLVideoElement],
  ])('skips a video that %s', (_name, current) => {
    const detect = vi.fn()
    renderHook(() => useInferenceLoop({ videoRef: { current }, detect, intervalMs: 50 }))

    vi.advanceTimersByTime(200)

    expect(detect).not.toHaveBeenCalled()
  })

  it('uses the latest detect without restarting the timer', () => {
    const first = vi.fn()
    const second = vi.fn()
    const videoRef = { current: video }
    const { rerender } = renderHook(
      ({ detect }) => useInferenceLoop({ videoRef, detect, intervalMs: 50 }),
      { initialProps: { detect: first } },
    )

    vi.advanceTimersByTime(30)
    rerender({ detect: second })
    vi.advanceTimersByTime(20)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops on unmount', () => {
    const detect = vi.fn()
    const { unmount } = renderHook(() => useInferenceLoop({ videoRef: { current: video }, detect, intervalMs: 50 }))

    unmount()
    vi.advanceTimersByTime(200)

    expect(detect).not.toHaveBeenCalled()
  })
})
