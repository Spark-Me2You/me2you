import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageService } from '@/core/supabase/storage'
import { silenceConsole } from '@/test/console'
import { queryResult, resetSupabaseMock, supabaseMock, type QueryOutcome } from '@/test/supabaseMock'
import { hubService } from './hubService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
vi.mock('@/core/supabase/storage', () => ({ storageService: { getPhotoUrl: vi.fn() } }))

const getPhotoUrl = vi.mocked(storageService.getPhotoUrl)

const userRow = (id: string, createdAt: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `User ${id}`,
  status: null,
  pronouns: null,
  major: null,
  interests: null,
  created_at: createdAt,
  ...extra,
})

const imageRow = (id: string, user: unknown, path = `${id}.jpg`) => ({ id, storage_path: path, user })

function routeTables(tables: { gesture_image: QueryOutcome; user: QueryOutcome }) {
  supabaseMock.from.mockImplementation((table: keyof typeof tables) => queryResult(tables[table]))
}

describe('hubService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    getPhotoUrl.mockReset().mockImplementation(async (path) => `https://signed/${path}`)
  })

  describe('getAllOrgUsers', () => {
    it('requires an org id', async () => {
      await expect(hubService.getAllOrgUsers('')).rejects.toThrow('Organization ID is required')
    })

    it('attaches signed image URLs to users with a photo and null to those without', async () => {
      routeTables({
        gesture_image: { data: [imageRow('i1', userRow('a', '2026-01-01'))] },
        user: { data: [userRow('a', '2026-01-01'), userRow('b', '2026-01-02')] },
      })

      const users = await hubService.getAllOrgUsers('org')

      expect(Object.fromEntries(users.map((u) => [u.user.id, u.profileImageUrl]))).toEqual({
        a: 'https://signed/i1.jpg',
        b: null,
      })
    })

    it('sorts newest users first', async () => {
      routeTables({
        gesture_image: { data: [] },
        user: { data: [userRow('old', '2026-01-01'), userRow('new', '2026-03-01'), userRow('mid', '2026-02-01')] },
      })

      const users = await hubService.getAllOrgUsers('org')

      expect(users.map((u) => u.user.id)).toEqual(['new', 'mid', 'old'])
    })

    it('accepts the embedded user as an array', async () => {
      routeTables({
        gesture_image: { data: [imageRow('i1', [userRow('a', '2026-01-01')])] },
        user: { data: [userRow('a', '2026-01-01')] },
      })

      const users = await hubService.getAllOrgUsers('org')

      expect(users[0].profileImageUrl).toBe('https://signed/i1.jpg')
    })

    it('returns one entry per user when they have several images', async () => {
      routeTables({
        gesture_image: {
          data: [
            imageRow('i1', userRow('a', '2026-01-01'), 'first.jpg'),
            imageRow('i2', userRow('a', '2026-01-01'), 'second.jpg'),
          ],
        },
        user: { data: [userRow('a', '2026-01-01')] },
      })

      await expect(hubService.getAllOrgUsers('org')).resolves.toHaveLength(1)
    })

    // KNOWN BUG: the code documents "keep first image found", but the
    // `usersWithImages.has()` check runs before an `await` inside Promise.all, so
    // every duplicate passes it and the last one to resolve wins. Remove `.fails`
    // once the check/set is made atomic.
    it.fails('keeps the first image when a user has several', async () => {
      routeTables({
        gesture_image: {
          data: [
            imageRow('i1', userRow('a', '2026-01-01'), 'first.jpg'),
            imageRow('i2', userRow('a', '2026-01-01'), 'second.jpg'),
          ],
        },
        user: { data: [userRow('a', '2026-01-01')] },
      })

      const users = await hubService.getAllOrgUsers('org')

      expect(users[0].profileImageUrl).toBe('https://signed/first.jpg')
    })

    it('skips images without user data', async () => {
      routeTables({
        gesture_image: { data: [imageRow('orphan', null)] },
        user: { data: [] },
      })
      await expect(hubService.getAllOrgUsers('org')).resolves.toEqual([])
    })

    it('keeps the user (with no image) if signing the URL fails', async () => {
      getPhotoUrl.mockRejectedValue(new Error('sign failed'))
      routeTables({
        gesture_image: { data: [imageRow('i1', userRow('a', '2026-01-01'))] },
        user: { data: [userRow('a', '2026-01-01')] },
      })

      const users = await hubService.getAllOrgUsers('org')

      expect(users).toHaveLength(1)
      expect(users[0].profileImageUrl).toBeNull()
    })

    it('defaults a missing accessory to null and keeps a set one', async () => {
      routeTables({
        gesture_image: { data: [] },
        user: { data: [userRow('a', '2026-01-02', { accessory: 'hat' }), userRow('b', '2026-01-01')] },
      })

      const users = await hubService.getAllOrgUsers('org')

      expect(users.map((u) => u.user.accessory)).toEqual(['hat', null])
    })

    it('only includes public users and images for the org', async () => {
      const queries: Record<string, ReturnType<typeof queryResult>> = {}
      supabaseMock.from.mockImplementation((table: string) => (queries[table] = queryResult({ data: [] })))

      await hubService.getAllOrgUsers('org-1')

      expect(queries.gesture_image.eq).toHaveBeenCalledWith('org_id', 'org-1')
      expect(queries.gesture_image.eq).toHaveBeenCalledWith('is_public', true)
      expect(queries.user.eq).toHaveBeenCalledWith('visibility', 'public')
    })

    it('throws when either query fails', async () => {
      routeTables({ gesture_image: { error: { message: 'img' } }, user: { data: [] } })
      await expect(hubService.getAllOrgUsers('org')).rejects.toThrow('Failed to fetch images: img')

      routeTables({ gesture_image: { data: [] }, user: { error: { message: 'usr' } } })
      await expect(hubService.getAllOrgUsers('org')).rejects.toThrow('Failed to fetch users: usr')
    })
  })

  describe('getGestureImageByOwnerId', () => {
    it('requires both ids', async () => {
      await expect(hubService.getGestureImageByOwnerId('', 'org')).rejects.toThrow('required')
      await expect(hubService.getGestureImageByOwnerId('u', '')).rejects.toThrow('required')
    })

    it('returns the newest public image path', async () => {
      const query = queryResult({ data: { storage_path: 'a/b.jpg' } })
      supabaseMock.from.mockReturnValue(query)

      await expect(hubService.getGestureImageByOwnerId('u', 'o')).resolves.toBe('a/b.jpg')
      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('returns null when missing or when the query fails', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: null }))
      await expect(hubService.getGestureImageByOwnerId('u', 'o')).resolves.toBeNull()

      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'x' } }))
      await expect(hubService.getGestureImageByOwnerId('u', 'o')).resolves.toBeNull()
    })
  })
})
