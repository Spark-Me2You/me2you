import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

import { supabaseMock, queryResult, resetSupabaseMock } from '@/test/supabaseMock'
import { silenceConsole } from '@/test/console'
import type { Database } from './database.types'
import { userRegistrationAuthService as service } from './userRegistrationAuth'

type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

const NOW = new Date('2025-01-01T00:00:00Z')
const nowSeconds = Math.floor(NOW.getTime() / 1000)

const sessionExpiringIn = (seconds: number | undefined) => ({
  access_token: 't',
  expires_at: seconds === undefined ? undefined : nowSeconds + seconds,
  user: { id: 'u1' },
})

beforeEach(() => {
  resetSupabaseMock()
  silenceConsole()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

/** Make `from()` return a fresh builder and expose it. */
function builderFor(outcome: Parameters<typeof queryResult>[0]) {
  const builder = queryResult(outcome)
  supabaseMock.from.mockReturnValue(builder)
  return builder
}

describe('signUp', () => {
  it('returns the user and session on success, sending the credentials', async () => {
    const user = { id: 'u1' }
    const session = sessionExpiringIn(3600)
    supabaseMock.auth.signUp.mockResolvedValue({ data: { user, session }, error: null })

    await expect(service.signUp('a@b.co', 'pw')).resolves.toEqual({ user, session })
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' })
  })

  it('throws when no session comes back (email confirmation required)', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null })

    await expect(service.signUp('a@b.co', 'pw')).rejects.toThrow(/confirm/i)
  })

  it('throws when no user comes back', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null })

    await expect(service.signUp('a@b.co', 'pw')).rejects.toThrow()
  })

  it('preserves the error code on user_already_exists so callers can rescue the account', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    })

    await expect(service.signUp('a@b.co', 'pw')).rejects.toMatchObject({
      code: 'user_already_exists',
      message: expect.stringContaining('User already registered'),
    })
  })
})

describe('signIn', () => {
  it('returns the user and session on success', async () => {
    const user = { id: 'u1' }
    const session = sessionExpiringIn(3600)
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null })

    await expect(service.signIn('a@b.co', 'pw')).resolves.toEqual({ user, session })
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' })
  })

  it('surfaces the auth error on failure', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    await expect(service.signIn('a@b.co', 'bad')).rejects.toThrow(/Invalid login credentials/)
  })

  it('throws when the response has no session', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    })

    await expect(service.signIn('a@b.co', 'pw')).rejects.toThrow()
  })
})

describe('signOut', () => {
  it('resolves when the client signs out cleanly', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null })

    await expect(service.signOut()).resolves.toBeUndefined()
    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('throws when the client reports an error', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'boom' } })

    await expect(service.signOut()).rejects.toThrow(/boom/)
  })
})

describe('getCurrentSession', () => {
  it('returns the session from the client', async () => {
    const session = sessionExpiringIn(3600)
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session } })

    await expect(service.getCurrentSession()).resolves.toBe(session)
  })

  it('returns null when signed out', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(service.getCurrentSession()).resolves.toBeNull()
  })
})

describe('createMinimalUserRecord', () => {
  it('inserts a private, not-yet-onboarded user row', async () => {
    const builder = builderFor({})

    await service.createMinimalUserRecord('u1', 'org1')

    expect(supabaseMock.from).toHaveBeenCalledWith('user')
    const expected = {
      id: 'u1',
      org_id: 'org1',
      name: '',
      onboarding_complete: false,
      visibility: 'private',
    } satisfies Insert<'user'>
    expect(builder.insert).toHaveBeenCalledWith(expected)
  })

  it('throws with the database message when the insert fails', async () => {
    builderFor({ error: { message: 'duplicate key' } })

    await expect(service.createMinimalUserRecord('u1', 'org1')).rejects.toThrow(/duplicate key/)
  })
})

describe('createUserProfile', () => {
  const input = {
    name: 'Pat',
    status: 'student',
    pronouns: 'they/them',
    major: 'CS',
    interests: ['art'],
    org_id: 'org1',
  }

  it('upserts a public profile keyed on the authenticated user id and returns the row', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const row = { id: 'u1', name: 'Pat' }
    const builder = builderFor({ data: row })

    await expect(service.createUserProfile(input)).resolves.toBe(row)

    expect(supabaseMock.from).toHaveBeenCalledWith('user')
    const expected = {
      id: 'u1',
      name: 'Pat',
      status: 'student',
      pronouns: 'they/them',
      major: 'CS',
      interests: ['art'],
      org_id: 'org1',
      visibility: 'public',
    } satisfies Insert<'user'>
    expect(builder.upsert).toHaveBeenCalledWith(expected, { onConflict: 'id' })
  })

  it('stores null for optional fields that are empty', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const builder = builderFor({ data: {} })

    await service.createUserProfile({ name: 'Pat', status: '', major: undefined, org_id: 'org1' })

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: null, pronouns: null, major: null, interests: null }),
      { onConflict: 'id' },
    )
  })

  it('throws without touching the database when nobody is signed in', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })

    await expect(service.createUserProfile(input)).rejects.toThrow()
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('throws with the database message when the upsert fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    builderFor({ error: { message: 'rls violation' } })

    await expect(service.createUserProfile(input)).rejects.toThrow(/rls violation/)
  })
})

describe('updateUserProfile', () => {
  const input = { name: 'Pat', status: 'student', pronouns: null, major: 'CS', interests: ['art'] }

  beforeEach(() => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: sessionExpiringIn(3600) },
      error: null,
    })
  })

  it('marks onboarding complete and public for the given user id', async () => {
    const row = { id: 'u1', name: 'Pat' }
    const builder = builderFor({ data: row })

    await expect(service.updateUserProfile('u1', input)).resolves.toBe(row)

    expect(supabaseMock.from).toHaveBeenCalledWith('user')
    const expected = {
      name: 'Pat',
      status: 'student',
      pronouns: null,
      major: 'CS',
      interests: ['art'],
      onboarding_complete: true,
      visibility: 'public',
    } satisfies Update<'user'>
    expect(builder.update).toHaveBeenCalledWith(expected)
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled()
  })

  it('throws with the database message when the update fails', async () => {
    builderFor({ error: { message: 'update denied' } })

    await expect(service.updateUserProfile('u1', input)).rejects.toThrow(/update denied/)
  })

  it('does not write anything when the session cannot be refreshed', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabaseMock.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'x' } })

    await expect(service.updateUserProfile('u1', input)).rejects.toThrow(/sign in again/i)
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })
})

describe('session freshness (ensureFreshSession via getCurrentUserProfile)', () => {
  beforeEach(() => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: sessionExpiringIn(3600) },
      error: null,
    })
    builderFor({ data: { id: 'u1', name: 'Pat' } })
  })

  it('does not refresh a session with plenty of time left', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(600) }, error: null })

    await service.getCurrentUserProfile()

    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled()
  })

  it('refreshes a session that expires within the two minute leeway', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(119) }, error: null })

    await service.getCurrentUserProfile()

    expect(supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('refreshes right at the leeway boundary but not just beyond it', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(120) }, error: null })
    await service.getCurrentUserProfile()
    expect(supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1)

    supabaseMock.auth.refreshSession.mockClear()
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(121) }, error: null })
    await service.getCurrentUserProfile()
    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled()
  })

  it('refreshes an already expired session', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(-30) }, error: null })

    await service.getCurrentUserProfile()

    expect(supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('treats a session with no expiry as near expiry', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(undefined) }, error: null })

    await service.getCurrentUserProfile()

    expect(supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('uses the advancing clock: a session fresh now is stale after time passes', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(600) }, error: null })
    await service.getCurrentUserProfile()
    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10 * 60 * 1000)
    await service.getCurrentUserProfile()
    expect(supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('throws when refreshing fails', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(10) }, error: null })
    supabaseMock.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'revoked' } })

    await expect(service.getCurrentUserProfile()).rejects.toThrow(/sign in again/i)
  })

  it('throws when the session lookup itself errors', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'storage' } })

    await expect(service.getCurrentUserProfile()).rejects.toThrow(/storage/)
    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled()
  })
})

describe('getCurrentUserProfile', () => {
  beforeEach(() => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: sessionExpiringIn(3600) }, error: null })
  })

  it('reads the signed-in user\'s row from the user table', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const row = { id: 'u1', name: 'Pat' }
    const builder = builderFor({ data: row })

    await expect(service.getCurrentUserProfile()).resolves.toBe(row)
    expect(supabaseMock.from).toHaveBeenCalledWith('user')
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('returns null without querying when nobody is signed in', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })

    await expect(service.getCurrentUserProfile()).resolves.toBeNull()
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('returns null when the row is missing', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    builderFor({ data: null })

    await expect(service.getCurrentUserProfile()).resolves.toBeNull()
  })

  it('returns null when the query errors', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    builderFor({ error: { message: 'boom' } })

    await expect(service.getCurrentUserProfile()).resolves.toBeNull()
  })
})

describe('checkOnboardingComplete', () => {
  it('returns true for a completed user and selects only the onboarding flag', async () => {
    const builder = builderFor({ data: { onboarding_complete: true } })

    await expect(service.checkOnboardingComplete('u1')).resolves.toBe(true)
    expect(supabaseMock.from).toHaveBeenCalledWith('user')
    expect(builder.select).toHaveBeenCalledWith('onboarding_complete')
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('returns false for an incomplete user', async () => {
    builderFor({ data: { onboarding_complete: false } })

    await expect(service.checkOnboardingComplete('u1')).resolves.toBe(false)
  })

  it('returns null when the row is missing', async () => {
    builderFor({ data: null })

    await expect(service.checkOnboardingComplete('u1')).resolves.toBeNull()
  })

  it('returns null when the flag itself is null', async () => {
    builderFor({ data: { onboarding_complete: null } })

    await expect(service.checkOnboardingComplete('u1')).resolves.toBeNull()
  })

  it('returns null when the query errors', async () => {
    builderFor({ error: { message: 'boom' } })

    await expect(service.checkOnboardingComplete('u1')).resolves.toBeNull()
  })
})

describe('createImageRecord', () => {
  const base = { owner_id: 'u1', org_id: 'org1', storage_path: 'u1/profile.png' }

  it('inserts into gesture_image with profile / public defaults and returns id and path', async () => {
    const row = { id: 'img1', storage_path: base.storage_path }
    const builder = builderFor({ data: row })

    await expect(service.createImageRecord(base)).resolves.toBe(row)

    expect(supabaseMock.from).toHaveBeenCalledWith('gesture_image')
    const expected = {
      owner_id: 'u1',
      org_id: 'org1',
      storage_path: 'u1/profile.png',
      category: 'profile',
      is_public: true,
    } satisfies Insert<'gesture_image'>
    expect(builder.insert).toHaveBeenCalledWith(expected)
    expect(builder.select).toHaveBeenCalledWith('id, storage_path')
  })

  it('honours explicit category and is_public: false', async () => {
    const builder = builderFor({ data: {} })

    await service.createImageRecord({ ...base, category: 'custom', is_public: false })

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'custom', is_public: false }),
    )
  })

  it('throws with the database message when the insert fails', async () => {
    builderFor({ error: { message: 'insert denied' } })

    await expect(service.createImageRecord(base)).rejects.toThrow(/insert denied/)
  })
})

describe('createGestureImageRecord', () => {
  const base = { owner_id: 'u1', org_id: 'org1', storage_path: 'u1/wave.png' }

  it('inserts into gesture_image defaulting the category to wave', async () => {
    const row = { id: 'img1', storage_path: base.storage_path }
    const builder = builderFor({ data: row })

    await expect(service.createGestureImageRecord(base)).resolves.toBe(row)

    expect(supabaseMock.from).toHaveBeenCalledWith('gesture_image')
    const expected = {
      owner_id: 'u1',
      org_id: 'org1',
      storage_path: 'u1/wave.png',
      category: 'wave',
      is_public: true,
    } satisfies Insert<'gesture_image'>
    expect(builder.insert).toHaveBeenCalledWith(expected)
  })

  it('honours is_public: false rather than defaulting it to true', async () => {
    const builder = builderFor({ data: {} })

    await service.createGestureImageRecord({ ...base, is_public: false })

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ is_public: false }))
  })

  it('throws with the database message when the insert fails', async () => {
    builderFor({ error: { message: 'insert denied' } })

    await expect(service.createGestureImageRecord(base)).rejects.toThrow(/insert denied/)
  })
})

describe('createCroppedImageRecord', () => {
  const landmarks = {
    leftEye: { x: 1, y: 2 },
    rightEye: { x: 3, y: 4 },
    faceCenter: { x: 5, y: 6 },
    noseTip: { x: 7, y: 8 },
    mouthCenter: { x: 9, y: 10 },
    chinBottom: { x: 11, y: 12 },
    foreheadTop: { x: 13, y: 14 },
  }
  const input = {
    owner_id: 'u1',
    org_id: 'org1',
    storage_path: 'u1/face.png',
    landmarks,
    is_public: false,
  }

  it('inserts into cropped_image mapping each landmark onto its point column', async () => {
    const row = { id: 'c1', storage_path: 'u1/face.png' }
    const builder = builderFor({ data: row })

    await expect(service.createCroppedImageRecord(input)).resolves.toBe(row)

    expect(supabaseMock.from).toHaveBeenCalledWith('cropped_image')
    const expected = {
      owner_id: 'u1',
      org_id: 'org1',
      storage_path: 'u1/face.png',
      is_public: false,
      left_eye_point: '(1,2)',
      right_eye_point: '(3,4)',
      centroid_point: '(5,6)',
      nose_tip_point: '(7,8)',
      mouth_center_point: '(9,10)',
      chin_bottom_point: '(11,12)',
      forehead_top_point: '(13,14)',
    } satisfies Insert<'cropped_image'>
    expect(builder.insert).toHaveBeenCalledWith(expected)
    expect(builder.select).toHaveBeenCalledWith('id, storage_path')
  })

  it('throws with the database message when the insert fails', async () => {
    builderFor({ error: { message: 'insert denied' } })

    await expect(service.createCroppedImageRecord(input)).rejects.toThrow(/insert denied/)
  })
})
