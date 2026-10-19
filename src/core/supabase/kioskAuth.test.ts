import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { kioskAuthService } from './kioskAuth'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

const minted = {
  success: true,
  access_token: 'access',
  refresh_token: 'refresh',
  kiosk_user_id: 'k1',
  org_id: 'org-1',
}

describe('kioskAuthService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
  })

  describe('mintKioskSession', () => {
    const kioskUser = { id: 'k1', app_metadata: { org_id: 'org-1', is_kiosk: true } }
    const kioskSession = { user: kioskUser }

    function happyPath() {
      supabaseMock.functions.invoke.mockResolvedValue({ data: minted, error: null })
      supabaseMock.auth.signOut.mockResolvedValue({ error: null })
      supabaseMock.auth.setSession.mockResolvedValue({
        data: { session: kioskSession, user: kioskUser },
        error: null,
      })
    }

    it('mints, signs out the admin, then installs the kiosk session', async () => {
      happyPath()

      const result = await kioskAuthService.mintKioskSession('org-1')

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('mint-kiosk-session', {
        body: { org_id: 'org-1' },
      })
      expect(supabaseMock.auth.setSession).toHaveBeenCalledWith({
        access_token: 'access',
        refresh_token: 'refresh',
      })
      expect(supabaseMock.auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(
        supabaseMock.auth.setSession.mock.invocationCallOrder[0],
      )
      expect(result).toEqual({ user: kioskUser, session: kioskSession, org_id: 'org-1' })
    })

    it('throws the edge function error and leaves the admin signed in', async () => {
      supabaseMock.functions.invoke.mockResolvedValue({ data: { success: false, error: 'not admin' }, error: null })

      await expect(kioskAuthService.mintKioskSession('org-1')).rejects.toThrow('not admin')
      expect(supabaseMock.auth.signOut).not.toHaveBeenCalled()
    })

    it('uses a generic message for a transport error', async () => {
      supabaseMock.functions.invoke.mockResolvedValue({ data: null, error: { message: 'offline' } })
      await expect(kioskAuthService.mintKioskSession('org-1')).rejects.toThrow('Failed to mint kiosk session')
    })

    it('stops if the admin sign-out fails', async () => {
      happyPath()
      supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'x' } })

      await expect(kioskAuthService.mintKioskSession('org-1')).rejects.toThrow('Failed to sign out admin session')
      expect(supabaseMock.auth.setSession).not.toHaveBeenCalled()
    })

    it('throws when the kiosk session cannot be set', async () => {
      happyPath()
      supabaseMock.auth.setSession.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'x' } })

      await expect(kioskAuthService.mintKioskSession('org-1')).rejects.toThrow('Failed to set kiosk session')
    })
  })

  describe('getCurrentKioskSession', () => {
    const sessionWith = (app_metadata: unknown) => ({
      data: { session: { user: { id: 'u', app_metadata } } },
      error: null,
    })

    it('recognizes a kiosk session by its app_metadata claims', async () => {
      supabaseMock.auth.getSession.mockResolvedValue(sessionWith({ is_kiosk: true, org_id: 'org-1' }))

      const result = await kioskAuthService.getCurrentKioskSession()

      expect(result?.org_id).toBe('org-1')
      expect(result?.user.id).toBe('u')
    })

    it.each([
      ['no session', { data: { session: null }, error: null }],
      ['a session error', { data: { session: null }, error: { message: 'x' } }],
      ['a non-kiosk user', sessionWith({ org_id: 'org-1' })],
      ['a kiosk flag without an org', sessionWith({ is_kiosk: true })],
      ['missing app_metadata', sessionWith(undefined)],
    ])('returns null for %s', async (_label, response) => {
      supabaseMock.auth.getSession.mockResolvedValue(response)
      await expect(kioskAuthService.getCurrentKioskSession()).resolves.toBeNull()
    })
  })

  it('exitKioskMode signs out', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null })
    await kioskAuthService.exitKioskMode()
    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
  })
})
