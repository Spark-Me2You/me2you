import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/features/discovery/types/image'
import { queryResult, type QueryOutcome } from '@/test/supabaseMock'
import { getEarnedBadges } from './badgeService'

const NOW = new Date('2026-10-19T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

const profile = (ageDays: number, id = 'user-1'): UserProfile =>
  ({
    id,
    org_id: 'org-1',
    created_at: new Date(NOW.getTime() - ageDays * DAY_MS).toISOString(),
  }) as UserProfile

const clientReturning = (outcome: QueryOutcome) =>
  ({ from: vi.fn(() => queryResult(outcome)) }) as unknown as SupabaseClient

const noTopScore = () => clientReturning({ data: null, error: { message: 'no rows' } })

describe('getEarnedBadges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns nothing without a profile', async () => {
    await expect(getEarnedBadges(null as unknown as UserProfile, noTopScore())).resolves.toEqual([])
  })

  it.each([
    [0, ['new_test']],
    [6.9, ['new_test']],
    [7, ['1week_test']],
    [29.9, ['1week_test']],
    [30, ['1week_test', '1month_test']],
    [365, ['1week_test', '1month_test']],
  ])('account aged %s days earns %j', async (age, expected) => {
    await expect(getEarnedBadges(profile(age), noTopScore())).resolves.toEqual(expected)
  })

  it('awards firstplace when the user owns the top score in their org', async () => {
    const client = clientReturning({ data: { owner_id: 'user-1' } })
    const badges = await getEarnedBadges(profile(0), client)
    expect(badges).toContain('firstplace_test')
  })

  it('does not award firstplace when someone else is on top', async () => {
    const client = clientReturning({ data: { owner_id: 'someone-else' } })
    expect(await getEarnedBadges(profile(0), client)).not.toContain('firstplace_test')
  })

  it('still returns age badges when the leaderboard query throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = {
      from: vi.fn(() => {
        throw new Error('network down')
      }),
    } as unknown as SupabaseClient

    await expect(getEarnedBadges(profile(10), client)).resolves.toEqual(['1week_test'])
    expect(console.warn).toHaveBeenCalled()
  })
})
