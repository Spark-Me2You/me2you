import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { adminAuthService } from './adminAuth'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

const user = { id: 'admin-1' }
const session = { user }
const admin = { id: 'admin-1', email: 'a@x.com', org_id: 'org', created_at: 't' }

describe('adminAuthService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
  })

  describe('signInWithEmail', () => {
    it('returns user, admin record and session for a real admin', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null })
      const query = queryResult({ data: admin })
      supabaseMock.from.mockReturnValue(query)

      await expect(adminAuthService.signInWithEmail('a@x.com', 'pw')).resolves.toEqual({ user, admin, session })
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@x.com', password: 'pw' })
      expect(supabaseMock.from).toHaveBeenCalledWith('admin')
      expect(query.eq).toHaveBeenCalledWith('id', 'admin-1')
    })

    it('fails on bad credentials without checking the admin table', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login' },
      })

      await expect(adminAuthService.signInWithEmail('a', 'b')).rejects.toThrow('Authentication failed: Invalid login')
      expect(supabaseMock.from).not.toHaveBeenCalled()
    })

    it('fails when auth returns no session', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: { user, session: null }, error: null })
      await expect(adminAuthService.signInWithEmail('a', 'b')).rejects.toThrow('No user or session')
    })

    it('signs out and rejects a signed-in user who is not an admin', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null })
      supabaseMock.from.mockReturnValue(queryResult({ data: null }))

      await expect(adminAuthService.signInWithEmail('a', 'b')).rejects.toThrow('not authorized as an admin')
      expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    })

    it('signs out and reports the database error when the admin lookup fails', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null })
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'rls', code: '42501' } as never }))

      await expect(adminAuthService.signInWithEmail('a', 'b')).rejects.toThrow(
        'Admin verification failed: rls (Code: 42501)',
      )
      expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('getCurrentAdmin', () => {
    it('returns null with no session or a session error', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
      await expect(adminAuthService.getCurrentAdmin()).resolves.toBeNull()

      supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'x' } })
      await expect(adminAuthService.getCurrentAdmin()).resolves.toBeNull()
    })

    it('returns the admin for a valid admin session', async () => {
      supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })
      supabaseMock.from.mockReturnValue(queryResult({ data: admin }))

      await expect(adminAuthService.getCurrentAdmin()).resolves.toEqual({ user, admin, session })
    })

    it('returns null if the session user is not an admin or the lookup fails', async () => {
      supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })

      supabaseMock.from.mockReturnValueOnce(queryResult({ data: null }))
      await expect(adminAuthService.getCurrentAdmin()).resolves.toBeNull()

      supabaseMock.from.mockReturnValueOnce(queryResult({ error: { message: 'x' } }))
      await expect(adminAuthService.getCurrentAdmin()).resolves.toBeNull()
    })

    it('swallows unexpected errors and returns null', async () => {
      supabaseMock.auth.getSession.mockRejectedValue(new Error('storage unavailable'))
      await expect(adminAuthService.getCurrentAdmin()).resolves.toBeNull()
    })
  })

  describe('signOut', () => {
    it('resolves on success and throws on error', async () => {
      supabaseMock.auth.signOut.mockResolvedValueOnce({ error: null })
      await expect(adminAuthService.signOut()).resolves.toBeUndefined()

      supabaseMock.auth.signOut.mockResolvedValueOnce({ error: { message: 'x' } })
      await expect(adminAuthService.signOut()).rejects.toThrow('Sign out failed: x')
    })
  })

  it('onAuthStateChange forwards the callback to Supabase', () => {
    const callback = vi.fn()
    adminAuthService.onAuthStateChange(callback)
    expect(supabaseMock.auth.onAuthStateChange).toHaveBeenCalledWith(callback)
  })
})
