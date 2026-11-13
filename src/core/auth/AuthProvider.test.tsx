import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

import { supabaseMock, queryResult, resetSupabaseMock } from '@/test/supabaseMock'
import { silenceConsole } from '@/test/console'
import { AuthProvider } from './AuthProvider'
import { useAuth, type AuthContextType } from './AuthContext'

type AuthCallback = (event: string, session: Session | null) => Promise<void> | void

const ADMIN_ROW = {
  id: 'u-admin',
  email: 'admin@example.com',
  org_id: 'org-admin',
  created_at: '2024-01-01',
}

function makeSession(
  id: string,
  appMetadata: Record<string, unknown> = {},
  userMetadata: Record<string, unknown> = {},
): Session {
  return {
    access_token: `token-${id}`,
    refresh_token: `refresh-${id}`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id, email: `${id}@example.com`, app_metadata: appMetadata, user_metadata: userMetadata },
  } as unknown as Session
}

const kioskSession = () => makeSession('kiosk-1', { is_kiosk: true, org_id: 'org-1' })
const plainSession = () => makeSession('u-plain')
const adminSession = () => makeSession('u-admin')

let latest: AuthContextType
let authCallback: AuthCallback
const unsubscribe = vi.fn()

function Probe() {
  const auth = useAuth()
  useEffect(() => {
    latest = auth
  })
  return <div data-testid="state">{`${auth.authMode}|${auth.isLoading ? 'loading' : 'ready'}`}</div>
}

/** Resolves `from('admin')` to `adminRow` (or an error) and other tables to `profileRow`. */
function mockTables({
  adminRow = null as unknown,
  adminError = null as { message: string } | null,
  profileRow = null as unknown,
} = {}) {
  supabaseMock.from.mockImplementation((table: string) =>
    table === 'admin'
      ? queryResult({ data: adminRow, error: adminError })
      : queryResult({ data: profileRow }),
  )
}

async function renderReady() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await waitFor(() => expect(latest.isLoading).toBe(false))
}

const modeText = () => screen.getByTestId('state').textContent

beforeEach(() => {
  resetSupabaseMock()
  silenceConsole()
  unsubscribe.mockReset()
  supabaseMock.auth.onAuthStateChange.mockImplementation((cb: AuthCallback) => {
    authCallback = cb
    return { data: { subscription: { unsubscribe } } }
  })
  supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  supabaseMock.auth.signOut.mockResolvedValue({ error: null })
  supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
  mockTables()
})

describe('AuthProvider initial load', () => {
  it('is loading until the session check resolves, then unauthenticated with no session', async () => {
    let release!: (v: unknown) => void
    supabaseMock.auth.getSession.mockReturnValue(new Promise((r) => (release = r)))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(modeText()).toBe('unauthenticated|loading')

    await act(async () => release({ data: { session: null }, error: null }))
    await waitFor(() => expect(modeText()).toBe('unauthenticated|ready'))
    expect(latest.isAuthenticated).toBe(false)
    expect(latest.user).toBeNull()
    expect(latest.session).toBeNull()
  })

  it('resolves a kiosk session (app_metadata) to kiosk mode with its org id', async () => {
    const session = kioskSession()
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })

    await renderReady()

    expect(latest.authMode).toBe('kiosk')
    expect(latest.kioskOrgId).toBe('org-1')
    expect(latest.admin).toBeNull()
    expect(latest.isAuthenticated).toBe(true)
    expect(latest.session).toBe(session)
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('does not trust user_metadata that claims to be a kiosk or an admin', async () => {
    const session = makeSession('spoof', {}, { is_kiosk: true, org_id: 'org-evil', role: 'admin' })
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })

    await renderReady()

    expect(latest.authMode).toBe('user')
    expect(latest.kioskOrgId).toBeNull()
    expect(latest.admin).toBeNull()
  })

  it('does not treat is_kiosk without an org id as a kiosk', async () => {
    const session = makeSession('half', { is_kiosk: true })
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })

    await renderReady()

    expect(latest.authMode).toBe('user')
    expect(latest.kioskOrgId).toBeNull()
  })

  it('resolves a session with a row in the admin table to admin mode', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })

    await renderReady()

    expect(latest.authMode).toBe('admin')
    expect(latest.admin).toEqual(ADMIN_ROW)
    expect(latest.kioskOrgId).toBeNull()
    expect(supabaseMock.from).toHaveBeenCalledWith('admin')
  })

  it('resolves a session without an admin row to user mode and loads the profile', async () => {
    const profile = { id: 'u-plain', name: 'Pat', org_id: 'org-1' }
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: plainSession() }, error: null })
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-plain' } } })
    mockTables({ adminRow: null, profileRow: profile })

    await renderReady()

    expect(latest.authMode).toBe('user')
    expect(latest.admin).toBeNull()
    expect(latest.userProfile).toEqual(profile)
    expect(supabaseMock.from).toHaveBeenCalledWith('user')
  })

  it('documents that a failing admin lookup silently downgrades an admin to a plain user', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
    mockTables({ adminError: { message: 'network down' } })

    await renderReady()

    // Current behaviour: the error is swallowed by adminAuthService.getCurrentAdmin (returns null),
    // so the session is classed as a regular user rather than surfacing an error.
    expect(latest.authMode).toBe('user')
    expect(latest.admin).toBeNull()
  })

  it('falls back to unauthenticated and clears state when initialisation throws', async () => {
    supabaseMock.auth.getSession.mockRejectedValue(new Error('storage unavailable'))

    await renderReady()

    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.user).toBeNull()
    expect(latest.session).toBeNull()
    expect(latest.kioskOrgId).toBeNull()
  })

  it('unsubscribes from auth changes on unmount', async () => {
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(latest.isLoading).toBe(false))
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('AuthProvider auth state changes', () => {
  it('ignores events that fire while initialisation is still running', async () => {
    let release!: (v: unknown) => void
    supabaseMock.auth.getSession.mockReturnValue(new Promise((r) => (release = r)))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => {
      await authCallback('SIGNED_IN', kioskSession())
    })
    expect(latest.authMode).toBe('unauthenticated')

    await act(async () => release({ data: { session: null }, error: null }))
    await waitFor(() => expect(latest.isLoading).toBe(false))
    expect(latest.authMode).toBe('unauthenticated')
  })

  it('SIGNED_OUT clears user, admin, session, profile and org', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: kioskSession() }, error: null })
    await renderReady()
    expect(latest.authMode).toBe('kiosk')

    await act(async () => {
      await authCallback('SIGNED_OUT', null)
    })

    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.user).toBeNull()
    expect(latest.session).toBeNull()
    expect(latest.kioskOrgId).toBeNull()
    expect(latest.isAuthenticated).toBe(false)
  })

  it('SIGNED_IN with kiosk app_metadata switches to kiosk mode without touching the admin table', async () => {
    await renderReady()
    const session = kioskSession()

    await act(async () => {
      await authCallback('SIGNED_IN', session)
    })

    expect(latest.authMode).toBe('kiosk')
    expect(latest.kioskOrgId).toBe('org-1')
    expect(latest.session).toBe(session)
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('SIGNED_IN checks the admin table: admin row gives admin mode', async () => {
    await renderReady()
    const session = adminSession()
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })
    mockTables({ adminRow: ADMIN_ROW })

    await act(async () => {
      await authCallback('SIGNED_IN', session)
    })

    expect(latest.authMode).toBe('admin')
    expect(latest.admin).toEqual(ADMIN_ROW)
  })

  it('SIGNED_IN without an admin row gives user mode', async () => {
    await renderReady()
    const session = plainSession()
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })

    await act(async () => {
      await authCallback('SIGNED_IN', session)
    })

    expect(latest.authMode).toBe('user')
    expect(latest.admin).toBeNull()
    expect(latest.session).toBe(session)
  })

  it('TOKEN_REFRESHED swaps the session but keeps mode, org and user', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: kioskSession() }, error: null })
    await renderReady()
    const user = latest.user
    const refreshed = { ...kioskSession(), access_token: 'fresh-token' } as Session

    await act(async () => {
      await authCallback('TOKEN_REFRESHED', refreshed)
    })

    expect(latest.authMode).toBe('kiosk')
    expect(latest.kioskOrgId).toBe('org-1')
    expect(latest.user).toBe(user)
    expect(latest.session?.access_token).toBe('fresh-token')
  })
})

describe('AuthProvider actions', () => {
  it('signIn sets admin mode from the admin service result', async () => {
    await renderReady()
    const session = adminSession()
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    })
    mockTables({ adminRow: ADMIN_ROW })

    await act(async () => {
      await latest.signIn('admin@example.com', 'pw')
    })

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'pw',
    })
    expect(latest.authMode).toBe('admin')
    expect(latest.admin).toEqual(ADMIN_ROW)
  })

  it('signIn for a non-admin rejects and leaves the provider unauthenticated', async () => {
    await renderReady()
    const session = plainSession()
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    })
    mockTables({ adminRow: null })

    await act(async () => {
      await expect(latest.signIn('x@example.com', 'pw')).rejects.toThrow()
    })

    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.admin).toBeNull()
    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
  })

  it('mintKioskSession moves an admin into kiosk mode and clears the admin', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })
    await renderReady()
    expect(latest.authMode).toBe('admin')

    const kiosk = kioskSession()
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { success: true, access_token: 'a', refresh_token: 'r', kiosk_user_id: 'kiosk-1', org_id: 'org-1' },
      error: null,
    })
    supabaseMock.auth.setSession.mockResolvedValue({
      data: { session: kiosk, user: kiosk.user },
      error: null,
    })

    await act(async () => {
      await latest.mintKioskSession('org-1')
    })

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('mint-kiosk-session', {
      body: { org_id: 'org-1' },
    })
    expect(latest.authMode).toBe('kiosk')
    expect(latest.kioskOrgId).toBe('org-1')
    expect(latest.admin).toBeNull()
  })

  it('mintKioskSession rethrows failures and leaves admin mode intact', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })
    await renderReady()
    supabaseMock.functions.invoke.mockResolvedValue({ data: { success: false, error: 'nope' }, error: null })

    await act(async () => {
      await expect(latest.mintKioskSession('org-1')).rejects.toThrow()
    })

    expect(latest.authMode).toBe('admin')
    expect(latest.kioskOrgId).toBeNull()
  })

  it('exitKioskMode signs out and clears kiosk state', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: kioskSession() }, error: null })
    await renderReady()

    await act(async () => {
      await latest.exitKioskMode()
    })

    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.kioskOrgId).toBeNull()
    expect(latest.session).toBeNull()
  })

  it('exitKioskMode rethrows when the remote sign-out rejects and keeps kiosk state', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: kioskSession() }, error: null })
    await renderReady()
    supabaseMock.auth.signOut.mockRejectedValue(new Error('offline'))

    await act(async () => {
      await expect(latest.exitKioskMode()).rejects.toThrow('offline')
    })

    expect(latest.authMode).toBe('kiosk')
  })

  it('signUpUser puts a new user into user mode', async () => {
    await renderReady()
    const session = plainSession()
    supabaseMock.auth.signUp.mockResolvedValue({ data: { user: session.user, session }, error: null })

    let returned: unknown
    await act(async () => {
      returned = await latest.signUpUser('new@example.com', 'pw')
    })

    expect(returned).toBe(session.user)
    expect(latest.authMode).toBe('user')
    expect(latest.user).toBe(session.user)
    expect(latest.isAuthenticated).toBe(true)
  })

  it('signUpUser leaves state unauthenticated and rethrows when signup fails', async () => {
    await renderReady()
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'exists', code: 'user_already_exists' },
    })

    await act(async () => {
      await expect(latest.signUpUser('a@example.com', 'pw')).rejects.toMatchObject({
        code: 'user_already_exists',
      })
    })

    expect(latest.authMode).toBe('unauthenticated')
  })

  it('signInUser authenticates as user and loads the profile', async () => {
    await renderReady()
    const session = plainSession()
    const profile = { id: 'u-plain', name: 'Pat' }
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    })
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null })
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: session.user } })
    mockTables({ profileRow: profile })

    await act(async () => {
      await latest.signInUser('u@example.com', 'pw')
    })

    expect(latest.authMode).toBe('user')
    expect(latest.userProfile).toEqual(profile)
  })

  it('setUserProfile stores the profile', async () => {
    await renderReady()
    const profile = { id: 'u1', name: 'Sam' } as unknown as Parameters<typeof latest.setUserProfile>[0]

    act(() => latest.setUserProfile(profile))

    expect(latest.userProfile).toBe(profile)
  })
})

describe('AuthProvider signOut', () => {
  it('admin signOut calls the remote sign-out and clears local state', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })
    await renderReady()

    await act(async () => {
      await latest.signOut()
    })

    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.admin).toBeNull()
    expect(latest.user).toBeNull()
    expect(latest.session).toBeNull()
  })

  it('kiosk signOut calls the remote sign-out and clears the org', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: kioskSession() }, error: null })
    await renderReady()

    await act(async () => {
      await latest.signOut()
    })

    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.kioskOrgId).toBeNull()
  })

  it('user signOut clears the profile as well', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: plainSession() }, error: null })
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-plain' } } })
    mockTables({ profileRow: { id: 'u-plain', name: 'Pat' } })
    await renderReady()
    expect(latest.userProfile).not.toBeNull()

    await act(async () => {
      await latest.signOut()
    })

    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    expect(latest.userProfile).toBeNull()
    expect(latest.authMode).toBe('unauthenticated')
  })

  it('clears local state even when the remote sign-out rejects', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })
    await renderReady()
    supabaseMock.auth.signOut.mockRejectedValue(new Error('offline'))

    await act(async () => {
      await latest.signOut()
    })

    expect(supabaseMock.auth.signOut).toHaveBeenCalled()
    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.session).toBeNull()
    expect(latest.admin).toBeNull()
  })

  it('clears local state when the remote sign-out reports an error', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })
    await renderReady()
    supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'server error' } })

    await act(async () => {
      await latest.signOut()
    })

    expect(latest.authMode).toBe('unauthenticated')
    expect(latest.user).toBeNull()
  })

  it('gives up on a hung remote sign-out after the timeout and still clears local state', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: adminSession() }, error: null })
    mockTables({ adminRow: ADMIN_ROW })
    await renderReady()
    supabaseMock.auth.signOut.mockReturnValue(new Promise(() => {}))

    vi.useFakeTimers()
    try {
      let done = false
      let pending!: Promise<void>
      act(() => {
        pending = latest.signOut().then(() => {
          done = true
        })
      })
      await vi.advanceTimersByTimeAsync(1000)
      expect(done).toBe(false)
      expect(latest.authMode).toBe('admin')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
        await pending
      })
      expect(done).toBe(true)
      expect(latest.authMode).toBe('unauthenticated')
      expect(latest.session).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
