import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { POSE_PROCESS_INTERVAL_MS, usePoseDetection } from './usePoseDetection'

const landmarker = vi.hoisted(() => ({ detectForVideo: vi.fn(), close: vi.fn() }))
const create = vi.hoisted(() => vi.fn())

vi.mock('@/core/cv/mediapipe-loader', () => ({ createPoseLandmarker: create }))

const video = { videoWidth: 640, videoHeight: 480, readyState: 4 } as HTMLVideoElement
const lm = (n: number) => [{ x: n, y: n, z: 0 }]

describe('usePoseDetection', () => {
  beforeEach(() => {
    landmarker.detectForVideo.mockReset()
    landmarker.close.mockReset()
    create.mockReset().mockResolvedValue(landmarker)
  })

  async function ready(numPoses?: number) {
    const hook = renderHook(() => usePoseDetection({ numPoses }))
    await act(async () => {})
    return hook
  }

  it('initializes the landmarker with the requested pose count', async () => {
    const { result } = await ready(2)
    expect(result.current.isInitialized).toBe(true)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ numPoses: 2 }))
  })

  it('exposes init errors', async () => {
    create.mockRejectedValue(new Error('wasm failed'))
    const { result } = await ready()
    expect(result.current.error).toBe('wasm failed')
    expect(result.current.isInitialized).toBe(false)
  })

  it('stores first and all poses and bumps the frame sequence', async () => {
    landmarker.detectForVideo.mockReturnValue({ landmarks: [lm(1), lm(2)] })
    const { result } = await ready()

    act(() => result.current.processFrame(video, 1000))

    expect(result.current.landmarksRef.current).toEqual(lm(1))
    expect(result.current.allLandmarksRef.current).toEqual([lm(1), lm(2)])
    expect(result.current.frameSequenceRef.current).toBe(1)
  })

  it('clears landmarks when nobody is detected', async () => {
    landmarker.detectForVideo.mockReturnValueOnce({ landmarks: [lm(1)] }).mockReturnValueOnce({ landmarks: [] })
    const { result } = await ready()

    act(() => result.current.processFrame(video, 1000))
    act(() => result.current.processFrame(video, 2000))

    expect(result.current.landmarksRef.current).toBeNull()
    expect(result.current.allLandmarksRef.current).toEqual([])
  })

  it('throttles frames closer together than the interval', async () => {
    landmarker.detectForVideo.mockReturnValue({ landmarks: [lm(1)] })
    const { result } = await ready()

    act(() => result.current.processFrame(video, 1000))
    act(() => result.current.processFrame(video, 1000 + POSE_PROCESS_INTERVAL_MS - 1))
    expect(landmarker.detectForVideo).toHaveBeenCalledTimes(1)

    act(() => result.current.processFrame(video, 1000 + POSE_PROCESS_INTERVAL_MS))
    expect(landmarker.detectForVideo).toHaveBeenCalledTimes(2)
  })

  it('skips videos that have no dimensions or are not ready', async () => {
    const { result } = await ready()
    act(() => result.current.processFrame({ ...video, videoWidth: 0 } as HTMLVideoElement, 1000))
    act(() => result.current.processFrame({ ...video, readyState: 1 } as HTMLVideoElement, 2000))
    expect(landmarker.detectForVideo).not.toHaveBeenCalled()
  })

  it('does nothing before initialization', () => {
    create.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePoseDetection())
    act(() => result.current.processFrame(video, 1000))
    expect(landmarker.detectForVideo).not.toHaveBeenCalled()
  })

  it('logs and survives a detector exception', async () => {
    silenceConsole('error')
    landmarker.detectForVideo.mockImplementation(() => { throw new Error('bad frame') })
    const { result } = await ready()
    expect(() => act(() => result.current.processFrame(video, 1000))).not.toThrow()
  })

  it('closes the landmarker on unmount, and one that resolves after unmount', async () => {
    const { unmount } = await ready()
    unmount()
    expect(landmarker.close).toHaveBeenCalledTimes(1)

    let resolve!: (l: typeof landmarker) => void
    create.mockReturnValue(new Promise((r) => { resolve = r }))
    const late = renderHook(() => usePoseDetection())
    late.unmount()
    await act(async () => { resolve(landmarker) })
    expect(landmarker.close).toHaveBeenCalledTimes(2)
  })
})
