import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { claimService } from '@/core/supabase/claimService'
import { useClaimQR } from './useClaimQR'

vi.mock('@/core/supabase/claimService', () => ({
  claimService: { generateClaimToken: vi.fn(), subscribeToClaim: vi.fn() },
}))
vi.mock('@/shared/sound/playClaimSound', () => ({ playClaimSound: vi.fn() }))

const service = vi.mocked(claimService)
const payload = { type: 'message' } as never

describe('useClaimQR', () => {
  const unsubscribe = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z'), toFake: ['Date', 'setInterval', 'clearInterval'] })
    service.generateClaimToken.mockReset()
    service.subscribeToClaim.mockReset().mockReturnValue(unsubscribe)
    service.generateClaimToken.mockResolvedValue({
      token_id: 't1',
      expires_at: '2026-01-01T00:01:00Z',
    } as never)
  })
  afterEach(() => vi.useRealTimers())

  it('generates a claim on mount and reports seconds remaining', async () => {
    const { result } = renderHook(() => useClaimQR(payload))
    await act(async () => {})

    expect(service.generateClaimToken).toHaveBeenCalledWith(payload)
    expect(result.current.claim?.token_id).toBe('t1')
    expect(result.current.secondsRemaining).toBe(60)
    expect(result.current.isGenerating).toBe(false)
  })

  it('exposes the error message when generation fails', async () => {
    service.generateClaimToken.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useClaimQR(payload))
    await act(async () => {})

    expect(result.current.error).toBe('boom')
    expect(result.current.claim).toBeNull()
  })

  it('counts down and calls onExpire at zero', async () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useClaimQR(payload, { onExpire }))
    await act(async () => {})

    act(() => { vi.advanceTimersByTime(30_000) })
    expect(result.current.secondsRemaining).toBe(30)
    expect(onExpire).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(30_000) })
    expect(result.current.secondsRemaining).toBe(0)
    expect(onExpire).toHaveBeenCalled()
  })

  it('forwards the realtime claim event and unsubscribes on unmount', async () => {
    const onClaimed = vi.fn()
    const { unmount } = renderHook(() => useClaimQR(payload, { onClaimed }))
    await act(async () => {})

    const handler = service.subscribeToClaim.mock.calls[0][1]
    handler({ type: 'message' } as never, 'user-9')
    expect(onClaimed).toHaveBeenCalledWith({ type: 'message' }, 'user-9')

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('regenerate requests a fresh token', async () => {
    const { result } = renderHook(() => useClaimQR(payload))
    await act(async () => {})

    await act(async () => { result.current.regenerate() })
    expect(service.generateClaimToken).toHaveBeenCalledTimes(2)
  })
})
