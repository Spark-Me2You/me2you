import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { storageService } from './storage'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

const bucket = { upload: vi.fn(), createSignedUrl: vi.fn(), remove: vi.fn() }

describe('storageService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    Object.values(bucket).forEach((fn) => fn.mockReset().mockResolvedValue({ error: null }))
    supabaseMock.storage.from.mockReturnValue(bucket)
  })

  describe('uploadPhoto', () => {
    it('uploads a jpeg to {org}/{user}/{uuid}.jpg without overwriting', async () => {
      const file = new Blob(['x'])

      const path = await storageService.uploadPhoto(file, 'user-1', 'org-1')

      expect(path).toMatch(/^org-1\/user-1\/[0-9a-f-]{36}\.jpg$/)
      expect(supabaseMock.storage.from).toHaveBeenCalledWith('images')
      expect(bucket.upload).toHaveBeenCalledWith(path, file, {
        contentType: 'image/jpeg',
        upsert: false,
      })
    })

    it('throws a descriptive error when the upload fails', async () => {
      bucket.upload.mockResolvedValue({ error: { message: 'too big' } })
      await expect(storageService.uploadPhoto(new Blob(), 'u', 'o')).rejects.toThrow(
        'Failed to upload photo: too big',
      )
    })
  })

  describe('uploadCroppedPhoto', () => {
    it('keeps PNG (transparency) as png', async () => {
      const png = new Blob(['x'], { type: 'image/png' })

      const path = await storageService.uploadCroppedPhoto(png, 'u', 'o', 'abc')

      expect(path).toBe('o/u/abc_cropped.png')
      expect(bucket.upload).toHaveBeenCalledWith(path, png, { contentType: 'image/png', upsert: false })
    })

    it('treats anything else as jpeg', async () => {
      const path = await storageService.uploadCroppedPhoto(new Blob(['x'], { type: 'image/webp' }), 'u', 'o', 'abc')
      expect(path).toBe('o/u/abc_cropped.jpg')
      expect(bucket.upload.mock.calls[0][2].contentType).toBe('image/jpeg')
    })

    it('throws a descriptive error when the upload fails', async () => {
      bucket.upload.mockResolvedValue({ error: { message: 'nope' } })
      await expect(storageService.uploadCroppedPhoto(new Blob(), 'u', 'o', 'a')).rejects.toThrow(
        'Failed to upload cropped photo: nope',
      )
    })
  })

  describe('getPhotoUrl', () => {
    it('returns a signed URL valid for an hour', async () => {
      bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null })

      await expect(storageService.getPhotoUrl('o/u/a.jpg')).resolves.toBe('https://signed')
      expect(bucket.createSignedUrl).toHaveBeenCalledWith('o/u/a.jpg', 3600)
    })

    it.each(['', '   '])('rejects an empty path (%j) without calling storage', async (path) => {
      await expect(storageService.getPhotoUrl(path)).rejects.toThrow('Storage path cannot be empty')
      expect(supabaseMock.storage.from).not.toHaveBeenCalled()
    })

    it('throws when signing fails or returns no URL', async () => {
      bucket.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'missing' } })
      await expect(storageService.getPhotoUrl('p')).rejects.toThrow('Failed to generate signed URL for path: p')

      bucket.createSignedUrl.mockResolvedValueOnce({ data: {}, error: null })
      await expect(storageService.getPhotoUrl('p')).rejects.toThrow('Failed to generate signed URL')
    })
  })

  describe('deletePhoto', () => {
    it('removes the path', async () => {
      await storageService.deletePhoto('o/u/a.jpg')
      expect(bucket.remove).toHaveBeenCalledWith(['o/u/a.jpg'])
    })

    it('throws on failure', async () => {
      bucket.remove.mockResolvedValue({ error: { message: 'denied' } })
      await expect(storageService.deletePhoto('p')).rejects.toThrow('Failed to delete photo: denied')
    })
  })
})
