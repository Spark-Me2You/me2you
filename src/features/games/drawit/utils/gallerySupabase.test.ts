import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { fetchTodaysDrawings, uploadDrawing, uploadTempDrawing } from './gallerySupabase'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

// 1x1 transparent PNG
const DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const storage = { upload: vi.fn(), createSignedUrl: vi.fn() }

describe('gallerySupabase', () => {
  beforeEach(() => {
    resetSupabaseMock()
    storage.upload.mockReset().mockResolvedValue({ error: null })
    storage.createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://signed' } })
    supabaseMock.storage.from.mockReturnValue(storage)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('uploadTempDrawing', () => {
    it('uploads a PNG blob under the org folder and returns its path', async () => {
      const { tempPath } = await uploadTempDrawing(DATA_URL, 'org-1')

      expect(tempPath).toMatch(/^org-1\/[0-9a-f-]{36}\.png$/)
      expect(supabaseMock.storage.from).toHaveBeenCalledWith('temp-drawings')
      const [path, blob, options] = storage.upload.mock.calls[0]
      expect(path).toBe(tempPath)
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/png')
      expect(blob.size).toBeGreaterThan(0)
      expect(options).toEqual({ contentType: 'image/png', upsert: false })
    })

    it('throws when the upload fails', async () => {
      storage.upload.mockResolvedValue({ error: { message: 'quota' } })
      await expect(uploadTempDrawing(DATA_URL, 'org-1')).rejects.toThrow(
        'Temp drawing upload failed: quota',
      )
    })
  })

  describe('uploadDrawing', () => {
    it('uploads, records the row, and returns a signed URL', async () => {
      const insert = queryResult()
      supabaseMock.from.mockReturnValue(insert)

      const submission = await uploadDrawing(DATA_URL, 'cat')

      expect(storage.upload.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.png$/)
      expect(insert.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: submission.id, word: 'cat' }),
      )
      expect(submission).toMatchObject({ word: 'cat', imageUrl: 'https://signed' })
    })

    it('reports a failed upload before touching the database', async () => {
      storage.upload.mockResolvedValue({ error: { message: 'nope' } })
      await expect(uploadDrawing(DATA_URL, 'cat')).rejects.toThrow('Gallery upload failed: nope')
      expect(supabaseMock.from).not.toHaveBeenCalled()
    })

    it('reports a failed insert', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'dup' } }))
      await expect(uploadDrawing(DATA_URL, 'cat')).rejects.toThrow('Gallery DB insert failed: dup')
    })
  })

  describe('fetchTodaysDrawings', () => {
    it('returns signed drawings, skipping unsigned ones', async () => {
      storage.createSignedUrl
        .mockResolvedValueOnce({ data: { signedUrl: 'https://one' } })
        .mockResolvedValueOnce({ data: null })
      supabaseMock.from.mockReturnValue(
        queryResult({
          data: [
            { id: '1', word: 'cat', image_path: 'a.png', created_at: 't1' },
            { id: '2', word: 'dog', image_path: 'b.png', created_at: 't2' },
          ],
        }),
      )

      await expect(fetchTodaysDrawings()).resolves.toEqual([
        { id: '1', word: 'cat', imageUrl: 'https://one', createdAt: 't1' },
      ])
    })

    it("only asks for rows since local midnight", async () => {
      const query = queryResult({ data: [] })
      supabaseMock.from.mockReturnValue(query)

      await fetchTodaysDrawings()

      const [column, since] = query.gte.mock.calls[0]
      const start = new Date(since)
      expect(column).toBe('created_at')
      expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0])
    })

    it('returns an empty list on error instead of throwing', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'x' } }))
      await expect(fetchTodaysDrawings()).resolves.toEqual([])
    })
  })
})
