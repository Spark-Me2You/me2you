import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'

const { createFromOptions, loadMediaPipeVision } = vi.hoisted(() => {
  const createFromOptions = vi.fn()
  return {
    createFromOptions,
    loadMediaPipeVision: vi.fn(async () => ({
      FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
      HandLandmarker: { createFromOptions },
    })),
  }
})

vi.mock('../mediapipe-loader', () => ({ loadMediaPipeVision }))

import { closeHandLandmarker, createHandLandmarker } from './handLandmarkerLoader'

const delegateOf = (call: number) => createFromOptions.mock.calls[call][1].baseOptions.delegate

describe('createHandLandmarker', () => {
  beforeEach(() => {
    createFromOptions.mockReset()
    silenceConsole('warn')
  })

  it('uses the GPU delegate when it works', async () => {
    const landmarker = { close: vi.fn() }
    createFromOptions.mockResolvedValue(landmarker)

    await expect(createHandLandmarker()).resolves.toBe(landmarker)
    expect(createFromOptions).toHaveBeenCalledTimes(1)
    expect(delegateOf(0)).toBe('GPU')
    closeHandLandmarker()
  })

  it('retries once on CPU and warns when GPU creation fails', async () => {
    const landmarker = { close: vi.fn() }
    createFromOptions.mockRejectedValueOnce(new Error('no webgl')).mockResolvedValueOnce(landmarker)

    await expect(createHandLandmarker()).resolves.toBe(landmarker)
    expect(createFromOptions).toHaveBeenCalledTimes(2)
    expect(delegateOf(1)).toBe('CPU')
    expect(console.warn).toHaveBeenCalled()
    closeHandLandmarker()
  })

  it('rejects when the CPU retry fails too', async () => {
    createFromOptions.mockRejectedValue(new Error('broken'))
    await expect(createHandLandmarker()).rejects.toThrow('broken')
    expect(createFromOptions).toHaveBeenCalledTimes(2)
  })
})
