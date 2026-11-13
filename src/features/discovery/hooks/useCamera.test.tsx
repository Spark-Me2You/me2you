import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { shared } = vi.hoisted(() => ({
  shared: {
    stream: { getTracks: vi.fn(() => [{ stop: vi.fn() }]) } as unknown as MediaStream,
    isLoading: false,
    error: null,
  },
}))

vi.mock('@/core/cv/SharedCameraProvider', () => ({ useSharedCamera: () => shared }))

import { useCamera } from './useCamera'

describe('useCamera', () => {
  const getUserMedia = vi.fn()

  beforeEach(() => {
    getUserMedia.mockReset()
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the shared stream without opening a second camera', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current).toEqual(shared)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('does not stop the shared tracks on unmount', () => {
    const { unmount } = renderHook(() => useCamera())
    unmount()
    expect(shared.stream?.getTracks).not.toHaveBeenCalled()
  })

  it('opens a private stream when constraints are given, and stops only that one', async () => {
    const stop = vi.fn()
    const own = { getTracks: () => [{ stop }] } as unknown as MediaStream
    getUserMedia.mockResolvedValue(own)
    const options = { videoConstraints: { width: { ideal: 480 } } }

    const { result, unmount } = renderHook(() => useCamera(options))
    await waitFor(() => expect(result.current.stream).toBe(own))
    unmount()

    expect(stop).toHaveBeenCalled()
    expect(shared.stream?.getTracks).not.toHaveBeenCalled()
  })
})
