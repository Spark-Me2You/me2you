import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { uploadTempDrawing } from './gallerySupabase'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

// 1x1 transparent PNG
const DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const storage = { upload: vi.fn() }

describe('gallerySupabase', () => {
  beforeEach(() => {
    resetSupabaseMock()
    storage.upload.mockReset().mockResolvedValue({ error: null })
    supabaseMock.storage.from.mockReturnValue(storage)
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
})
