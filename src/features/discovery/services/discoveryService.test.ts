import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageService } from '@/core/supabase/storage'
import { silenceConsole } from '@/test/console'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { discoveryService } from './discoveryService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
vi.mock('@/core/supabase/storage', () => ({ storageService: { getPhotoUrl: vi.fn() } }))

const getPhotoUrl = vi.mocked(storageService.getPhotoUrl)

const owner = { id: 'u1', name: 'Ann', status: 'hi', pronouns: null, major: null, interests: null, created_at: 't' }

const image = (id: string, user: unknown = owner) => ({
  id,
  owner_id: 'u1',
  org_id: 'org',
  storage_path: `${id}.jpg`,
  category: 'wave',
  is_public: true,
  created_at: 't',
  user,
})

describe('discoveryService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    getPhotoUrl.mockReset().mockImplementation(async (path) => `https://signed/${path}`)
  })

  describe('fetchRandomImage', () => {
    it('requires an org id', async () => {
      await expect(discoveryService.fetchRandomImage('')).rejects.toThrow('Organization ID is required')
    })

    it('picks a random image and shapes image, owner and signed URL', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // last of two
      supabaseMock.from.mockReturnValue(queryResult({ data: [image('a'), image('b')] }))

      const result = await discoveryService.fetchRandomImage('org')

      expect(result?.image.id).toBe('b')
      expect(result?.imageUrl).toBe('https://signed/b.jpg')
      expect(result?.image.cropped_path).toBeNull()
      expect(result?.owner).toMatchObject({ id: 'u1', org_id: 'org', name: 'Ann', accessory: null })
    })

    it('filters by category only when one is given', async () => {
      const withCategory = queryResult({ data: [] })
      supabaseMock.from.mockReturnValueOnce(withCategory)
      await discoveryService.fetchRandomImage('org', 'wave')
      expect(withCategory.eq).toHaveBeenCalledWith('category', 'wave')

      const without = queryResult({ data: [] })
      supabaseMock.from.mockReturnValueOnce(without)
      await discoveryService.fetchRandomImage('org')
      expect(without.eq).not.toHaveBeenCalledWith('category', expect.anything())
    })

    it('returns null when no public images exist', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: [] }))
      await expect(discoveryService.fetchRandomImage('org')).resolves.toBeNull()
    })

    it('accepts the embedded owner as an array', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: [image('a', [owner])] }))
      const result = await discoveryService.fetchRandomImage('org')
      expect(result?.owner.name).toBe('Ann')
    })

    it('throws when the image has no owner', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: [image('a', null)] }))
      await expect(discoveryService.fetchRandomImage('org')).rejects.toThrow('Image owner data is missing')
    })

    it('throws the database error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'down' } }))
      await expect(discoveryService.fetchRandomImage('org')).rejects.toThrow('Failed to fetch images: down')
    })
  })

  describe('getImageCount', () => {
    it('requires org and category', async () => {
      await expect(discoveryService.getImageCount('', 'wave')).rejects.toThrow('required')
      await expect(discoveryService.getImageCount('org', '')).rejects.toThrow('required')
    })

    it('returns the exact count, defaulting null to 0', async () => {
      supabaseMock.from.mockReturnValueOnce(queryResult({ count: 7 }))
      await expect(discoveryService.getImageCount('org', 'wave')).resolves.toBe(7)

      supabaseMock.from.mockReturnValueOnce(queryResult({ count: null }))
      await expect(discoveryService.getImageCount('org', 'wave')).resolves.toBe(0)
    })

    it('throws on error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'x' } }))
      await expect(discoveryService.getImageCount('org', 'wave')).rejects.toThrow('Failed to count images: x')
    })
  })

  describe('fetchRandomImageBatch', () => {
    const countThenRows = (count: number | null, rows: unknown[]) => {
      const rowsQuery = queryResult({ data: rows })
      supabaseMock.from.mockReturnValueOnce(queryResult({ count })).mockReturnValueOnce(rowsQuery)
      return rowsQuery
    }

    it('validates its arguments', async () => {
      await expect(discoveryService.fetchRandomImageBatch('', 'wave', 5)).rejects.toThrow('required')
      await expect(discoveryService.fetchRandomImageBatch('org', 'wave', 0)).rejects.toThrow(
        'Limit must be greater than 0',
      )
    })

    it('returns an empty batch without a second query when there are no images', async () => {
      supabaseMock.from.mockReturnValueOnce(queryResult({ count: 0 }))
      await expect(discoveryService.fetchRandomImageBatch('org', 'wave', 5)).resolves.toEqual([])
      expect(supabaseMock.from).toHaveBeenCalledTimes(1)
    })

    it('picks a random window that stays inside the category', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const rows = countThenRows(20, [])

      await discoveryService.fetchRandomImageBatch('org', 'wave', 5)

      // maxOffset = 20 - 5 = 15, so the last possible window is 15..19.
      expect(rows.range).toHaveBeenCalledWith(15, 19)
    })

    it('starts at 0 when the category has fewer images than the limit', async () => {
      const rows = countThenRows(3, [])
      await discoveryService.fetchRandomImageBatch('org', 'wave', 5)
      expect(rows.range).toHaveBeenCalledWith(0, 4)
    })

    it('returns every image with a signed URL, in shuffled order', async () => {
      countThenRows(3, [image('a'), image('b'), image('c')])

      const batch = await discoveryService.fetchRandomImageBatch('org', 'wave', 3)

      expect(batch.map((b) => b.image.id).sort()).toEqual(['a', 'b', 'c'])
      expect(batch.every((b) => b.imageUrl.startsWith('https://signed/'))).toBe(true)
    })

    it('fails the batch if any image has no owner', async () => {
      countThenRows(2, [image('a'), image('b', null)])
      await expect(discoveryService.fetchRandomImageBatch('org', 'wave', 2)).rejects.toThrow(
        'Image b has no owner data',
      )
    })

    it('throws when the rows query fails', async () => {
      supabaseMock.from
        .mockReturnValueOnce(queryResult({ count: 5 }))
        .mockReturnValueOnce(queryResult({ error: { message: 'x' } }))
      await expect(discoveryService.fetchRandomImageBatch('org', 'wave', 2)).rejects.toThrow(
        'Failed to fetch image batch: x',
      )
    })
  })
})
