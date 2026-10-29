import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { claimService } from '@/core/supabase/claimService'
import { useClaimScanner } from './useClaimScanner'

const scanner = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('html5-qrcode', () => ({ Html5Qrcode: vi.fn(function () { return scanner }) }))
vi.mock('@/core/supabase/claimService', () => ({ claimService: { executeClaim: vi.fn() } }))

const TOKEN = '123e4567-e89b-12d3-a456-426614174000'

describe('useClaimScanner', () => {
  const onSuccess = vi.fn()
  const onError = vi.fn()

  beforeEach(() => {
    scanner.start.mockReset().mockResolvedValue(undefined)
    scanner.stop.mockReset().mockResolvedValue(undefined)
    vi.mocked(claimService.executeClaim).mockReset()
    onSuccess.mockReset()
    onError.mockReset()
  })

  const setup = () => renderHook(() => useClaimScanner({ elementId: 'qr', onSuccess, onError }))
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

  it('executes the claim for a claim URL, stopping the scanner first', async () => {
    vi.mocked(claimService.executeClaim).mockResolvedValue({ payload: { type: 'message' } } as never)
    const { result } = setup()
    await act(async () => { await result.current.start() })

    await decode(`https://example.com/claim/${TOKEN}?x=1`)

    expect(scanner.stop).toHaveBeenCalled()
    expect(claimService.executeClaim).toHaveBeenCalledWith(TOKEN)
    expect(onSuccess).toHaveBeenCalledWith({ type: 'message' })
    expect(result.current.isScanning).toBe(false)
    expect(result.current.isProcessing).toBe(false)
  })

  it('ignores QR codes that are not claim links', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })

    await decode('https://example.com/something-else')
    await decode('https://example.com/claim/not-a-uuid')

    expect(claimService.executeClaim).not.toHaveBeenCalled()
    expect(scanner.stop).not.toHaveBeenCalled()
  })

  it('surfaces a failed claim through error state and onError', async () => {
    vi.mocked(claimService.executeClaim).mockRejectedValue(new Error('expired'))
    const { result } = setup()
    await act(async () => { await result.current.start() })

    await decode(`/claim/${TOKEN}`)

    expect(result.current.error).toBe('expired')
    expect(onError).toHaveBeenCalledWith('expired')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('stop tolerates an already-stopped scanner', async () => {
    const { result } = setup()
    await act(async () => { await result.current.start() })
    scanner.stop.mockRejectedValue(new Error('not running'))

    await act(async () => { await result.current.stop() })
    expect(result.current.isScanning).toBe(false)
  })
})
