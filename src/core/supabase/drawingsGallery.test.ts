import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { deleteMyDrawing, fetchMyDrawings, fetchOrgDrawings } from './drawingsGallery'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

const storage = { createSignedUrl: vi.fn(), remove: vi.fn() }

const row = (id: string, owner: unknown = { name: 'Ann' }) => ({
  id,
  owner_id: 'u1',
  image_path: `org/${id}.png`,
  prompt: 'cat',
  created_at: '2026-10-19T00:00:00Z',
  owner,
})

describe('drawingsGallery', () => {
  beforeEach(() => {
    resetSupabaseMock()
    storage.createSignedUrl.mockReset().mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://signed/${path}` },
    }))
    storage.remove.mockReset().mockResolvedValue({ error: null })
    supabaseMock.storage.from.mockReturnValue(storage)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('fetchOrgDrawings', () => {
    it('queries by org, newest first, and signs each image', async () => {
      const query = queryResult({ data: [row('d1')] })
      supabaseMock.from.mockReturnValue(query)

      const drawings = await fetchOrgDrawings('org')

      expect(query.eq).toHaveBeenCalledWith('org_id', 'org')
      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(supabaseMock.storage.from).toHaveBeenCalledWith('drawings')
      expect(drawings).toEqual([
        {
          id: 'd1',
          prompt: 'cat',
          imageUrl: 'https://signed/org/d1.png',
          imagePath: 'org/d1.png',
          createdAt: '2026-10-19T00:00:00Z',
          ownerId: 'u1',
          ownerName: 'Ann',
        },
      ])
    })

    it('normalizes the owner whether it is an object, array, or missing', async () => {
      supabaseMock.from.mockReturnValue(
        queryResult({
          data: [row('a', { name: 'Obj' }), row('b', [{ name: 'Arr' }]), row('c', []), row('d', null)],
        }),
      )

      const names = (await fetchOrgDrawings('org')).map((d) => d.ownerName)

      expect(names).toEqual(['Obj', 'Arr', null, null])
    })

    it('drops drawings whose image could not be signed', async () => {
      storage.createSignedUrl.mockImplementation(async (path: string) =>
        path.includes('bad') ? { data: null } : { data: { signedUrl: 'https://ok' } },
      )
      supabaseMock.from.mockReturnValue(queryResult({ data: [row('good'), row('bad')] }))

      const drawings = await fetchOrgDrawings('org')

      expect(drawings.map((d) => d.id)).toEqual(['good'])
    })

    it('throws on a query error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'rls' } }))
      await expect(fetchOrgDrawings('org')).rejects.toThrow('rls')
    })
  })

  describe('fetchMyDrawings', () => {
    it('filters by owner', async () => {
      const query = queryResult({ data: [] })
      supabaseMock.from.mockReturnValue(query)

      await expect(fetchMyDrawings('u1')).resolves.toEqual([])
      expect(query.eq).toHaveBeenCalledWith('owner_id', 'u1')
    })
  })

  describe('deleteMyDrawing', () => {
    const drawing = { id: 'd1', imagePath: 'org/d1.png' }

    it('removes the file, then the row', async () => {
      const query = queryResult()
      supabaseMock.from.mockReturnValue(query)

      await deleteMyDrawing(drawing)

      expect(storage.remove).toHaveBeenCalledWith(['org/d1.png'])
      expect(query.delete).toHaveBeenCalled()
      expect(query.eq).toHaveBeenCalledWith('id', 'd1')
    })

    it('still deletes the row when the file delete fails', async () => {
      storage.remove.mockResolvedValue({ error: { message: 'missing' } })
      const query = queryResult()
      supabaseMock.from.mockReturnValue(query)

      await expect(deleteMyDrawing(drawing)).resolves.toBeUndefined()
      expect(query.delete).toHaveBeenCalled()
    })

    it('throws when the row delete fails', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'denied' } }))
      await expect(deleteMyDrawing(drawing)).rejects.toThrow('denied')
    })
  })
})
