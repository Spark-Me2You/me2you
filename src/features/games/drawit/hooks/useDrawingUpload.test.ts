import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { canContinue, useDrawingUpload } from './useDrawingUpload'

const upload = vi.hoisted(() => vi.fn())
vi.mock('../utils/gallerySupabase', () => ({ uploadTempDrawing: upload }))

const setup = (orgId: string | null = 'org-1') =>
  renderHook(() => useDrawingUpload({ imageDataUrl: 'data:x', word: 'cat', orgId }))

describe('useDrawingUpload', () => {
  beforeEach(() => {
    upload.mockReset()
    silenceConsole()
  })

  it('reaches ready with a claim payload on success', async () => {
    upload.mockResolvedValue({ tempPath: 'org-1/a.png' })
    const { result } = setup()
    await act(() => result.current.start())
    expect(result.current.stage).toMatchObject({
      kind: 'ready',
      payload: { data: { image_path: 'org-1/a.png', prompt: 'cat' } },
    })
    expect(canContinue(result.current.stage)).toBe(true)
  })

  it('does not allow continuing while idle or uploading', async () => {
    let resolve!: (v: { tempPath: string }) => void
    upload.mockReturnValue(new Promise((r) => (resolve = r)))
    const { result } = setup()
    expect(canContinue(result.current.stage)).toBe(false)
    let p!: Promise<void>
    act(() => {
      p = result.current.start()
    })
    expect(result.current.stage.kind).toBe('uploading')
    expect(canContinue(result.current.stage)).toBe(false)
    await act(async () => {
      resolve({ tempPath: 'p' })
      await p
    })
    expect(result.current.stage.kind).toBe('ready')
  })

  it('can retry after a failed upload', async () => {
    upload.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ tempPath: 'p' })
    const { result } = setup()
    await act(() => result.current.start())
    expect(result.current.stage).toEqual({ kind: 'error', message: 'network' })
    expect(canContinue(result.current.stage)).toBe(false)

    await act(() => result.current.start())
    expect(result.current.stage.kind).toBe('ready')
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it('dismiss returns an error to idle so the claim button is usable again', async () => {
    upload.mockRejectedValueOnce(new Error('network'))
    const { result } = setup()
    await act(() => result.current.start())
    act(() => result.current.dismiss())
    expect(result.current.stage.kind).toBe('idle')
  })

  it('errors, and stays retryable, when the kiosk has no org', async () => {
    const { result } = setup(null)
    await act(() => result.current.start())
    expect(result.current.stage.kind).toBe('error')
    expect(upload).not.toHaveBeenCalled()
  })

  it('ignores a second start while already ready', async () => {
    upload.mockResolvedValue({ tempPath: 'p' })
    const { result } = setup()
    await act(() => result.current.start())
    await act(() => result.current.start())
    expect(upload).toHaveBeenCalledTimes(1)
  })
})
