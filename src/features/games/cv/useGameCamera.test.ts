import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameCamera } from './useGameCamera'

const useCamera = vi.hoisted(() => vi.fn())

vi.mock('@/features/discovery/hooks/useCamera', () => ({ useCamera }))

const stream = {} as MediaStream
const newVideo = () => ({ srcObject: null }) as HTMLVideoElement

describe('useGameCamera', () => {
  beforeEach(() => {
    useCamera.mockReset().mockReturnValue({ stream, isLoading: false, error: null })
  })

  it('requests a low-resolution, front-facing 30fps stream by default', () => {
    renderHook(() => useGameCamera())
    expect(useCamera.mock.calls[0][0].videoConstraints).toEqual({
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: 'user',
    })
  })

  it('accepts a custom size', () => {
    renderHook(() => useGameCamera({ width: 480, height: 270 }))
    const { width, height } = useCamera.mock.calls[0][0].videoConstraints
    expect({ width, height }).toEqual({ width: { ideal: 480 }, height: { ideal: 270 } })
  })

  it('keeps the same constraints across renders so the device is not reopened', () => {
    const { rerender } = renderHook(() => useGameCamera())
    rerender()
    expect(useCamera.mock.calls[1][0]).toBe(useCamera.mock.calls[0][0])
  })

  it('attaches the stream to the video and exposes it on videoRef', () => {
    const { result } = renderHook(() => useGameCamera())
    const video = newVideo()

    result.current.attachVideo(video)

    expect(video.srcObject).toBe(stream)
    expect(result.current.videoRef.current).toBe(video)
  })

  it('returns a new attachVideo when the stream arrives, so React re-attaches', () => {
    useCamera.mockReturnValue({ stream: null, isLoading: true, error: null })
    const { result, rerender } = renderHook(() => useGameCamera())
    const before = result.current.attachVideo

    useCamera.mockReturnValue({ stream, isLoading: false, error: null })
    rerender()

    expect(result.current.attachVideo).not.toBe(before)
    const video = newVideo()
    result.current.attachVideo(video)
    expect(video.srcObject).toBe(stream)
  })

  it('clears videoRef when the video unmounts', () => {
    const { result } = renderHook(() => useGameCamera())
    result.current.attachVideo(newVideo())
    result.current.attachVideo(null)
    expect(result.current.videoRef.current).toBeNull()
  })

  it('passes through loading and error state', () => {
    useCamera.mockReturnValue({ stream: null, isLoading: false, error: 'denied' })
    const { result } = renderHook(() => useGameCamera())
    expect(result.current.error).toBe('denied')
    expect(result.current.isLoading).toBe(false)
  })
})
