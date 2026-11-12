import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClaimScanner } from './useClaimScanner'

// Mirrors html5-qrcode: stop() throws synchronously (a string) when the
// scanner isn't running, rather than returning a rejected promise.
const scanner = vi.hoisted(() => {
  const s = {
    running: false,
    start: vi.fn(),
    stop: vi.fn(),
  }
  return s
})

vi.mock('html5-qrcode', () => ({ Html5Qrcode: vi.fn(function () { return scanner }) }))

const TOKEN = '123e4567-e89b-12d3-a456-426614174000'

describe('useClaimScanner', () => {
  const onScan = vi.fn()

  beforeEach(() => {
    scanner.running = false
    scanner.start.mockReset().mockImplementation(async () => { scanner.running = true })
    scanner.stop.mockReset().mockImplementation(() => {
      if (!scanner.running) throw 'Cannot stop, scanner is not running or paused.'
      scanner.running = false
      return Promise.resolve()
    })
    onScan.mockReset()
  })

  const setup = () => renderHook(() => useClaimScanner({ elementId: 'qr', onScan }))
  const decode = async (text: string) => {
    const onDecode = scanner.start.mock.calls[0][2] as (t: string) => Promise<void>
    await act(async () => { await onDecode(text) })
  }

  it('starts scanning with the rear camera', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })

    expect(result.current.isScanning).toBe(true)
    expect(scanner.start).toHaveBeenCalledWith({ facingMode: 'environment' }, expect.anything(), expect.any(Function), undefined)
  })

  it('reports camera start failures', async () => {
    scanner.start.mockRejectedValue(new Error('Permission denied'))
    const { result } = setup()
    await act(async () => { await result.current.start() })

    expect(result.current.error).toBe('Permission denied')
    expect(result.current.isScanning).toBe(false)
  })

  it('stops the camera and hands over the token for a claim URL', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })

    await decode(`https://example.com/claim/${TOKEN}?x=1`)

    expect(scanner.running).toBe(false)
    expect(onScan).toHaveBeenCalledWith(TOKEN)
    expect(result.current.isScanning).toBe(false)
  })

  it('hands over only the first claim code even if more frames decode', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })

    await decode(`/claim/${TOKEN}`)
    await decode(`/claim/${TOKEN}`)

    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('ignores QR codes that are not claim links', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })

    await decode('https://example.com/something-else')
    await decode('https://example.com/claim/not-a-uuid')

    expect(onScan).not.toHaveBeenCalled()
    expect(scanner.running).toBe(true)
  })

  it('stop tolerates an already-stopped scanner', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })
    await act(async () => { await result.current.stop() })

    await act(async () => { await result.current.stop() })
    expect(result.current.isScanning).toBe(false)
  })

  // Regression: tapping ✕ stopped the scanner, then the unmount cleanup
  // stopped it again; the synchronous throw blanked the whole app.
  it('closing (stop, then unmount) does not throw', async () => {
    const { result, unmount } = setup()
    await act(async () => { await result.current.start() })

    await act(async () => { await result.current.stop() })
    expect(() => unmount()).not.toThrow()
    expect(scanner.running).toBe(false)
  })

  it('unmounting after a scan (navigating to the claim) does not throw', async () => {
    const { result, unmount } = setup()
    await act(async () => { await result.current.start() })

    await decode(`/claim/${TOKEN}`)
    expect(() => unmount()).not.toThrow()
  })

  it('closing while the camera is still starting releases it once started', async () => {
    let finishStart!: () => void
    scanner.start.mockImplementation(() => new Promise<void>((resolve) => {
      finishStart = () => { scanner.running = true; resolve() }
    }))
    const { result, unmount } = setup()
    let starting!: Promise<void>
    act(() => { starting = result.current.start() })
    await vi.waitFor(() => expect(scanner.start).toHaveBeenCalled())

    expect(() => unmount()).not.toThrow()
    await act(async () => { finishStart(); await starting })
    expect(scanner.running).toBe(false)
  })
})
