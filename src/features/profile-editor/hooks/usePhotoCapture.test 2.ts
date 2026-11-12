import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { usePhotoCapture } from './usePhotoCapture'

const gesture = vi.hoisted(() => ({
  state: { detectedGesture: null as { gestureName: string } | null, isInitialized: true },
  processVideoFrame: vi.fn(),
}))

vi.mock('@/features/discovery/hooks/useGestureRecognition', () => ({
  useGestureRecognition: () => ({ ...gesture.state, processVideoFrame: gesture.processVideoFrame }),
}))

function fakeStream() {
  const track = { stop: vi.fn(), readyState: 'live' }
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream }
}

function fakeVideo() {
  const video = document.createElement('video')
  Object.defineProperty(video, 'readyState', { value: 4 })
  video.play = vi.fn().mockResolvedValue(undefined)
  return video
}

describe('usePhotoCapture', () => {
  const getUserMedia = vi.fn()

  beforeEach(() => {
    silenceConsole()
    getUserMedia.mockReset()
    gesture.state = { detectedGesture: null, isInitialized: true }
    gesture.processVideoFrame.mockReset()
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })

  async function started() {
    const { track, stream } = fakeStream()
    getUserMedia.mockResolvedValue(stream)
    const hook = renderHook(() => usePhotoCapture())
    const video = fakeVideo()
    ;(hook.result.current.videoRef as { current: HTMLVideoElement | null }).current = video
    await act(async () => { await hook.result.current.startCamera() })
    return { ...hook, track, stream, video }
  }

  it('attaches the stream to the video and becomes ready', async () => {
    const { result, stream, video } = await started()

    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }))
    expect(video.srcObject).toBe(stream)
    expect(video.play).toHaveBeenCalled()
    expect(result.current.isCameraReady).toBe(true)
    expect(result.current.cameraError).toBeNull()
  })

  it.each([
    ['NotAllowedError', 'camera access denied'],
    ['NotFoundError', 'no camera found'],
  ])('maps %s to a friendly message', async (name, text) => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name }))
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => { await result.current.startCamera() })

    expect(result.current.cameraError).toContain(text)
    expect(result.current.isCameraReady).toBe(false)
  })

  it('reports other errors verbatim and non-Errors generically', async () => {
    const { result } = renderHook(() => usePhotoCapture())

    getUserMedia.mockRejectedValueOnce(new Error('boom'))
    await act(async () => { await result.current.startCamera() })
    expect(result.current.cameraError).toBe('camera error: boom')

    getUserMedia.mockRejectedValueOnce('weird')
    await act(async () => { await result.current.startCamera() })
    expect(result.current.cameraError).toBe('failed to access camera')
  })

  it('stopCamera stops tracks and clears all capture state', async () => {
    const { result, track, video } = await started()

    act(() => result.current.stopCamera())

    expect(track.stop).toHaveBeenCalled()
    expect(video.srcObject).toBeNull()
    expect(result.current).toMatchObject({ isCameraReady: false, photo: null, previewUrl: null })
  })

  it('discards a stream that resolves after stopCamera', async () => {
    const { track, stream } = fakeStream()
    let resolve!: (s: MediaStream) => void
    getUserMedia.mockReturnValue(new Promise<MediaStream>((r) => { resolve = r }))
    const { result } = renderHook(() => usePhotoCapture())

    let pending!: Promise<void>
    act(() => { pending = result.current.startCamera() })
    act(() => result.current.stopCamera())
    await act(async () => { resolve(stream); await pending })

    expect(track.stop).toHaveBeenCalled()
    expect(result.current.isCameraReady).toBe(false)
  })

  describe('gesture detection', () => {
    it('maps a recognised gesture to its category', () => {
      gesture.state = { detectedGesture: { gestureName: 'Victory' }, isInitialized: true }
      const { result } = renderHook(() => usePhotoCapture())
      expect(result.current.detectedGestureName).toBe('Victory')
      expect(result.current.detectedCategory).toBe('peace_sign')
    })

    it('ignores gestures with no mapping', () => {
      gesture.state = { detectedGesture: { gestureName: 'Nonsense' }, isInitialized: true }
      const { result } = renderHook(() => usePhotoCapture())
      expect(result.current.detectedCategory).toBeNull()
    })

    it('exposes whether the recogniser is ready', () => {
      gesture.state = { detectedGesture: null, isInitialized: false }
      const { result } = renderHook(() => usePhotoCapture())
      expect(result.current.isGestureReady).toBe(false)
    })
  })

  describe('capturePhoto', () => {
    function withCanvas(hook: ReturnType<typeof renderHook<ReturnType<typeof usePhotoCapture>, unknown>>, blob: Blob | null) {
      const ctx = { translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn() }
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ctx),
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(blob)),
      }
      ;(hook.result.current.canvasRef as { current: unknown }).current = canvas
      return { ctx, canvas }
    }

    it('draws the frame mirrored and stores the JPEG with a preview URL', async () => {
      const hook = await started()
      Object.defineProperty(hook.video, 'videoWidth', { value: 640 })
      Object.defineProperty(hook.video, 'videoHeight', { value: 480 })
      const blob = new Blob(['jpg'])
      const { ctx, canvas } = withCanvas(hook, blob)

      act(() => hook.result.current.capturePhoto())

      expect(canvas.width).toBe(640)
      expect(ctx.translate).toHaveBeenCalledWith(640, 0)
      expect(ctx.scale).toHaveBeenCalledWith(-1, 1)
      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
      expect(hook.result.current.photo).toBe(blob)
      expect(hook.result.current.previewUrl).toBe('blob:photo')
      expect(gesture.processVideoFrame).toHaveBeenCalled()
    })

    it('keeps no photo when the canvas produces no blob', async () => {
      const hook = await started()
      withCanvas(hook, null)
      act(() => hook.result.current.capturePhoto())
      expect(hook.result.current.photo).toBeNull()
    })

    it('does nothing without a canvas', async () => {
      const hook = await started()
      expect(() => act(() => hook.result.current.capturePhoto())).not.toThrow()
      expect(hook.result.current.photo).toBeNull()
    })
  })

  it('retakePhoto clears the photo and revokes the preview without restarting a healthy stream', async () => {
    const hook = await started()
    const { canvas } = (() => {
      const c = { width: 0, height: 0, getContext: () => ({ translate() {}, scale() {}, drawImage() {} }), toBlob: (cb: (b: Blob) => void) => cb(new Blob(['x'])) }
      ;(hook.result.current.canvasRef as { current: unknown }).current = c
      return { canvas: c }
    })()
    void canvas
    act(() => hook.result.current.capturePhoto())
    expect(hook.result.current.previewUrl).toBe('blob:photo')

    act(() => hook.result.current.retakePhoto())

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
    expect(hook.result.current.photo).toBeNull()
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })
})
