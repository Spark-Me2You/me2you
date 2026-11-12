import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'

const { detectForVideo, fakeLandmarker, handSample } = vi.hoisted(() => {
  const detectForVideo = vi.fn()
  return {
    detectForVideo,
    fakeLandmarker: { detectForVideo, close: vi.fn() },
    handSample: {
      detected: false, tipX: 0, tipY: 0, handScale: 0, wristX: 0, wristY: 0, timestamp: 0, frameId: 0,
    },
  }
})

vi.mock('./handLandmarkerLoader', () => ({
  createHandLandmarker: vi.fn(async () => fakeLandmarker),
  closeHandLandmarker: vi.fn(),
}))
vi.mock('../SharedCameraProvider', () => {
  const stream = {} as MediaStream
  return { useSharedCamera: () => ({ stream, isLoading: false, error: null }) }
})
vi.mock('./CvCursorEnabledContext', () => {
  const ref = { current: handSample }
  return { useCvCursorEnabled: () => ({ handTrackRef: ref }) }
})

import { useCvCursor } from './useCvCursor'

describe('useCvCursor frame loop', () => {
  let queue: FrameRequestCallback[] = []

  const runFrames = (n: number) => {
    for (let i = 0; i < n; i++) {
      const cbs = queue
      queue = []
      cbs.forEach((cb) => cb(0))
    }
  }

  beforeEach(() => {
    queue = []
    detectForVideo.mockReset()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    silenceConsole('error')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function setup() {
    const { result } = renderHook(() => useCvCursor(true))
    result.current.videoRef.current = {
      readyState: 4, videoWidth: 1280, videoHeight: 720, play: () => Promise.resolve(),
    } as unknown as HTMLVideoElement
    await act(async () => {})
    return result
  }

  it('keeps scheduling frames after detectForVideo throws', async () => {
    detectForVideo
      .mockImplementationOnce(() => {
        throw new Error('timestamp not monotonic')
      })
      .mockReturnValue({ landmarks: [] })
    await setup()

    // Frames alternate skip/process, so 6 frames give 3 detections.
    runFrames(6)

    expect(detectForVideo).toHaveBeenCalledTimes(3)
    expect(queue.length).toBe(1)
  })

  it('passes strictly increasing performance.now timestamps, not the wall clock', async () => {
    detectForVideo.mockReturnValue({ landmarks: [] })
    let t = 100
    vi.spyOn(performance, 'now').mockImplementation(() => (t += 10))
    vi.spyOn(Date, 'now').mockReturnValue(5) // wall clock stuck or stepping back
    await setup()
    runFrames(6)

    const stamps = detectForVideo.mock.calls.map((c) => c[1] as number)
    expect(stamps.length).toBe(3)
    expect(stamps[1]).toBeGreaterThan(stamps[0])
    expect(stamps[2]).toBeGreaterThan(stamps[1])
    expect(stamps[0]).toBeGreaterThan(5)
    vi.restoreAllMocks()
  })

  it('logs a persistent failure at most once per interval', async () => {
    detectForVideo.mockImplementation(() => {
      throw new Error('boom')
    })
    await setup()
    runFrames(20)
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
