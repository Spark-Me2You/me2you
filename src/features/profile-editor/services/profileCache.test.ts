import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ACCESSORY_SETTINGS, type ProfileWithImage } from '../types/profileTypes'
import { profileCache } from './profileCache'

const PROFILE = { profile: { id: 'u1' }, imageUrl: 'https://x/photo?token=1' } as unknown as ProfileWithImage

describe('profileCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    profileCache.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('returns what was stored for the same user', () => {
    profileCache.setProfile('u1', PROFILE)
    profileCache.setAccessorySettings('u1', { ...DEFAULT_ACCESSORY_SETTINGS, selected_accessory: 'hat' })

    expect(profileCache.getProfile('u1')).toBe(PROFILE)
    expect(profileCache.getAccessorySettings('u1')?.selected_accessory).toBe('hat')
  })

  it("never returns another user's data", () => {
    profileCache.setProfile('u1', PROFILE)
    expect(profileCache.getProfile('u2')).toBeNull()
    expect(profileCache.getProfile(null)).toBeNull()
  })

  it('expires before the signed image URLs do (they last an hour)', () => {
    profileCache.setProfile('u1', PROFILE)
    vi.advanceTimersByTime(44 * 60 * 1000)
    expect(profileCache.getProfile('u1')).toBe(PROFILE)
    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(profileCache.getProfile('u1')).toBeNull()
  })

  it('clear forgets everything (sign-out)', () => {
    profileCache.setProfile('u1', PROFILE)
    profileCache.setAccessorySettings('u1', DEFAULT_ACCESSORY_SETTINGS)
    profileCache.clear()
    expect(profileCache.getProfile('u1')).toBeNull()
    expect(profileCache.getAccessorySettings('u1')).toBeNull()
  })
})
