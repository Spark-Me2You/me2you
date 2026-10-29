import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/core/auth'
import { useAdminLogin } from './useAdminLogin'

vi.mock('@/core/auth', () => ({ useAuth: vi.fn() }))

const signIn = vi.fn()

describe('useAdminLogin', () => {
  beforeEach(() => {
    signIn.mockReset()
    vi.mocked(useAuth).mockReturnValue({ signIn } as never)
  })

  it('returns true and no error on success', async () => {
    signIn.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAdminLogin())

    let ok: boolean | undefined
    await act(async () => { ok = await result.current.login('a@x.com', 'pw') })

    expect(ok).toBe(true)
    expect(signIn).toHaveBeenCalledWith('a@x.com', 'pw')
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('returns false and exposes the error message on failure', async () => {
    signIn.mockRejectedValue(new Error('bad creds'))
    const { result } = renderHook(() => useAdminLogin())

    let ok: boolean | undefined
    await act(async () => { ok = await result.current.login('a', 'b') })

    expect(ok).toBe(false)
    expect(result.current.error).toBe('bad creds')
    expect(result.current.isLoading).toBe(false)
  })

  it('falls back to a generic message for non-Error rejections and clears it on retry', async () => {
    signIn.mockRejectedValueOnce('nope').mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useAdminLogin())

    await act(async () => { await result.current.login('a', 'b') })
    expect(result.current.error).toBe('Failed to sign in')

    await act(async () => { await result.current.login('a', 'b') })
    expect(result.current.error).toBeNull()
  })

  it('is loading while the request is pending', async () => {
    let resolve!: () => void
    signIn.mockReturnValue(new Promise<void>((r) => { resolve = r }))
    const { result } = renderHook(() => useAdminLogin())

    let pending!: Promise<boolean>
    act(() => { pending = result.current.login('a', 'b') })
    expect(result.current.isLoading).toBe(true)

    await act(async () => { resolve(); await pending })
    expect(result.current.isLoading).toBe(false)
  })
})
