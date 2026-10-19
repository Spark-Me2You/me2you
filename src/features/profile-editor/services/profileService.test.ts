import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storageService } from '@/core/supabase/storage'
import { faceCropService } from '@/features/registration/services/faceCropService'
import { registrationService } from '@/features/registration/services/registrationService'
import { silenceConsole } from '@/test/console'
import { queryResult, resetSupabaseMock, supabaseMock, type QueryOutcome } from '@/test/supabaseMock'
import { profileService } from './profileService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
vi.mock('@/core/supabase/storage', () => ({
  storageService: { getPhotoUrl: vi.fn(), uploadPhoto: vi.fn(), deletePhoto: vi.fn() },
}))
vi.mock('@/features/registration/services/faceCropService', () => ({
  faceCropService: { cropFace: vi.fn() },
  FaceNotDetectedError: class FaceNotDetectedError extends Error {},
}))
vi.mock('@/features/registration/services/registrationService', () => ({
  registrationService: { uploadCroppedPhotoWithLandmarks: vi.fn() },
}))

const storage = vi.mocked(storageService)
const faceCrop = vi.mocked(faceCropService)
const registration = vi.mocked(registrationService)

const farFuture = () => Math.floor(Date.now() / 1000) + 3600
const fresh = { sessionExpiresAt: farFuture() }

function routeTables(tables: Record<string, QueryOutcome>) {
  supabaseMock.from.mockImplementation((table: string) => queryResult(tables[table] ?? {}))
}

describe('profileService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    storage.getPhotoUrl.mockReset().mockImplementation(async (p) => `https://signed/${p}`)
    storage.uploadPhoto.mockReset().mockResolvedValue('org/u1/new.jpg')
    storage.deletePhoto.mockReset().mockResolvedValue(undefined)
    faceCrop.cropFace.mockReset()
    registration.uploadCroppedPhotoWithLandmarks.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  describe('getCurrentProfile', () => {
    const profile = { id: 'u1', name: 'Ann' }

    it('returns null without a session or user id', async () => {
      supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
      await expect(profileService.getCurrentProfile()).resolves.toBeNull()
    })

    it('throws when the session lookup errors', async () => {
      supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'x' } })
      await expect(profileService.getCurrentProfile()).rejects.toThrow('Failed to get current session: x')
    })

    it('resolves the user from the session and assembles photos and landmarks', async () => {
      supabaseMock.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
      routeTables({
        user: { data: profile },
        gesture_image: { data: { id: 'g1', storage_path: 'g.jpg' } },
        cropped_image: {
          data: {
            id: 'c1',
            storage_path: 'c.png',
            centroid_point: '(0.5,0.25)',
            left_eye_point: { x: 0.1, y: 0.2 },
            right_eye_point: 'garbage',
            forehead_top_point: null,
          },
        },
      })

      const result = await profileService.getCurrentProfile()

      expect(result).toMatchObject({
        profile,
        imageUrl: 'https://signed/g.jpg',
        imageStoragePath: 'g.jpg',
        imageId: 'g1',
        bobbleheadUrl: 'https://signed/c.png',
        bobbleheadId: 'c1',
        bobbleheadLandmarks: {
          centroid_point: { x: 0.5, y: 0.25 },
          left_eye_point: { x: 0.1, y: 0.2 },
          right_eye_point: null,
          forehead_top_point: null,
        },
      })
    })

    it('uses a supplied userId without touching the session', async () => {
      routeTables({ user: { data: profile } })
      const result = await profileService.getCurrentProfile({ userId: 'u1' })
      expect(supabaseMock.auth.getSession).not.toHaveBeenCalled()
      expect(result).toMatchObject({ imageUrl: null, bobbleheadUrl: null, bobbleheadLandmarks: null })
    })

    it('returns null if the profile row is missing', async () => {
      routeTables({ user: { error: { message: 'none' } } })
      await expect(profileService.getCurrentProfile({ userId: 'u1' })).resolves.toBeNull()
    })

    it('degrades to null urls when signing fails', async () => {
      storage.getPhotoUrl.mockRejectedValue(new Error('denied'))
      routeTables({ user: { data: profile }, gesture_image: { data: { id: 'g1', storage_path: 'g.jpg' } } })

      const result = await profileService.getCurrentProfile({ userId: 'u1' })
      expect(result).toMatchObject({ imageUrl: null, imageStoragePath: 'g.jpg' })
    })

    it('times out a hanging query', async () => {
      vi.useFakeTimers()
      supabaseMock.from.mockImplementation(() => {
        const hanging = queryResult({})
        ;(hanging as { then: unknown }).then = () => {}
        return hanging
      })
      const pending = expect(profileService.getCurrentProfile({ userId: 'u1' })).rejects.toThrow(
        'Fetch profile timed out after 8000ms',
      )
      await vi.advanceTimersByTimeAsync(8000)
      await pending
    })
  })

  describe('updateProfile', () => {
    it('updates the row and stamps updated_at', async () => {
      const query = queryResult({ data: { id: 'u1', name: 'New' } })
      supabaseMock.from.mockReturnValue(query)

      const result = await profileService.updateProfile('u1', { name: 'New' } as never, fresh)

      expect(result).toEqual({ id: 'u1', name: 'New' })
      expect(query.update).toHaveBeenCalledWith({ name: 'New', updated_at: expect.any(String) })
      expect(query.eq).toHaveBeenCalledWith('id', 'u1')
    })

    it('surfaces database errors without retrying', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'violates check' } }))
      await expect(profileService.updateProfile('u1', {} as never, fresh)).rejects.toThrow(
        'Failed to update profile: violates check',
      )
      expect(supabaseMock.from).toHaveBeenCalledTimes(1)
    })

    it('retries once on a transient network error', async () => {
      supabaseMock.from
        .mockReturnValueOnce(queryResult({ error: { message: 'network down' } }))
        .mockReturnValueOnce(queryResult({ data: { id: 'u1' } }))

      await expect(profileService.updateProfile('u1', {} as never, fresh)).resolves.toEqual({ id: 'u1' })
      expect(supabaseMock.from).toHaveBeenCalledTimes(2)
    })

    it('gives up after one retry', async () => {
      supabaseMock.from.mockImplementation(() => queryResult({ error: { message: 'fetch failed' } }))
      await expect(profileService.updateProfile('u1', {} as never, fresh)).rejects.toThrow('fetch failed')
      expect(supabaseMock.from).toHaveBeenCalledTimes(2)
    })

    describe('session freshness', () => {
      it('refreshes when the known session is about to expire', async () => {
        supabaseMock.auth.getSession.mockResolvedValue({
          data: { session: { expires_at: Math.floor(Date.now() / 1000) + 10 } },
          error: null,
        })
        supabaseMock.auth.refreshSession.mockResolvedValue({ data: { session: {} }, error: null })
        supabaseMock.from.mockReturnValue(queryResult({ data: { id: 'u1' } }))

        await profileService.updateProfile('u1', {} as never, { sessionExpiresAt: Math.floor(Date.now() / 1000) + 10 })

        expect(supabaseMock.auth.refreshSession).toHaveBeenCalled()
      })

      it('does not refresh a session that is still valid', async () => {
        supabaseMock.from.mockReturnValue(queryResult({ data: { id: 'u1' } }))
        await profileService.updateProfile('u1', {} as never, fresh)
        expect(supabaseMock.auth.getSession).not.toHaveBeenCalled()
      })

      it('asks the user to sign in again when the refresh fails', async () => {
        supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
        supabaseMock.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'x' } })

        await expect(profileService.updateProfile('u1', {} as never)).rejects.toThrow(
          'Session expired. Please sign in again and retry.',
        )
        expect(supabaseMock.from).not.toHaveBeenCalled()
      })
    })
  })

  describe('deletePhoto', () => {
    it('removes the storage object then the row', async () => {
      const query = queryResult({})
      supabaseMock.from.mockReturnValue(query)

      await profileService.deletePhoto('g1', 'g.jpg')

      expect(storage.deletePhoto).toHaveBeenCalledWith('g.jpg')
      expect(supabaseMock.from).toHaveBeenCalledWith('gesture_image')
      expect(query.eq).toHaveBeenCalledWith('id', 'g1')
    })

    it('still deletes the row if storage deletion fails', async () => {
      storage.deletePhoto.mockRejectedValue(new Error('gone'))
      const query = queryResult({})
      supabaseMock.from.mockReturnValue(query)

      await profileService.deletePhoto('g1', 'g.jpg')
      expect(query.delete).toHaveBeenCalled()
    })

    it('throws when the row deletion fails', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'rls' } }))
      await expect(profileService.deletePhoto('g1', 'g.jpg')).rejects.toThrow('Failed to delete image record: rls')
    })
  })

  describe('edge function wrappers', () => {
    it('deleteAllImages returns the counts', async () => {
      supabaseMock.functions.invoke.mockResolvedValue({
        data: { success: true, gesture_rows_deleted: 1, cropped_rows_deleted: 2, storage_objects_deleted: 3 },
        error: null,
      })
      await expect(profileService.deleteAllImages()).resolves.toEqual({
        gesture_rows_deleted: 1,
        cropped_rows_deleted: 2,
        storage_objects_deleted: 3,
      })
      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('delete-user-images', { body: {} })
    })

    it.each([
      ['transport error', { data: null, error: { message: 'offline' } }, 'offline'],
      ['function failure', { data: { success: false, error: 'nope' }, error: null }, 'nope'],
      ['empty response', { data: null, error: null }, 'Failed to delete images'],
    ])('deleteAllImages rejects on %s', async (_l, response, message) => {
      supabaseMock.functions.invoke.mockResolvedValue(response)
      await expect(profileService.deleteAllImages()).rejects.toThrow(message)
    })

    it('deleteAccount resolves on success and rejects on failure', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({ data: { success: true }, error: null })
      await expect(profileService.deleteAccount()).resolves.toBeUndefined()
      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('delete-user-account', { body: {} })

      supabaseMock.functions.invoke.mockResolvedValueOnce({ data: { success: false }, error: null })
      await expect(profileService.deleteAccount()).rejects.toThrow('Failed to delete account')
    })
  })

  describe('updatePhoto', () => {
    const photo = new Blob(['x'])
    const landmarks = { centroid: { x: 0, y: 0 } }

    function happyPath() {
      supabaseMock.functions.invoke.mockResolvedValue({
        data: { success: true, gesture_rows_deleted: 0, cropped_rows_deleted: 0, storage_objects_deleted: 0 },
        error: null,
      })
      const insert = queryResult({ data: { id: 'new', storage_path: 'org/u1/new.jpg' } })
      supabaseMock.from.mockReturnValue(insert)
      faceCrop.cropFace.mockResolvedValue({ croppedBlob: new Blob(['c']), cropMetadata: { landmarks } } as never)
      return insert
    }

    it('purges old images, uploads, inserts the record and generates the bobblehead', async () => {
      const insert = happyPath()

      const result = await profileService.updatePhoto(photo, 'u1', 'org', 'wave', null, null, fresh)

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('delete-user-images', { body: {} })
      expect(storage.uploadPhoto).toHaveBeenCalledWith(photo, 'u1', 'org')
      expect(insert.insert).toHaveBeenCalledWith({
        owner_id: 'u1',
        org_id: 'org',
        storage_path: 'org/u1/new.jpg',
        category: 'wave',
        is_public: true,
      })
      expect(registration.uploadCroppedPhotoWithLandmarks).toHaveBeenCalledWith(expect.any(Blob), 'u1', 'org', landmarks)
      expect(result).toEqual({ id: 'new', storage_path: 'org/u1/new.jpg', bobbleheadError: undefined })
    })

    it('continues when the old photo cannot be deleted or purged', async () => {
      happyPath()
      storage.deletePhoto.mockRejectedValue(new Error('x'))
      supabaseMock.functions.invoke.mockResolvedValue({ data: null, error: { message: 'purge failed' } })

      const result = await profileService.updatePhoto(photo, 'u1', 'org', 'wave', 'old', 'old.jpg', fresh)
      expect(result.id).toBe('new')
    })

    it('aborts without a record when the upload fails', async () => {
      happyPath()
      storage.uploadPhoto.mockRejectedValue(new Error('quota'))

      await expect(profileService.updatePhoto(photo, 'u1', 'org', 'wave', null, null, fresh)).rejects.toThrow('quota')
      expect(faceCrop.cropFace).not.toHaveBeenCalled()
    })

    it('throws if the image record cannot be created', async () => {
      happyPath()
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'fk' } }))

      await expect(profileService.updatePhoto(photo, 'u1', 'org', 'wave', null, null, fresh)).rejects.toThrow(
        'Failed to create image record: fk',
      )
    })

    it('reports a bobblehead error but still succeeds when no landmarks are found', async () => {
      happyPath()
      faceCrop.cropFace.mockResolvedValue({ croppedBlob: new Blob(), cropMetadata: { landmarks: null } } as never)

      const result = await profileService.updatePhoto(photo, 'u1', 'org', 'wave', null, null, fresh)

      expect(result.bobbleheadError).toBe('No face landmarks detected')
      expect(registration.uploadCroppedPhotoWithLandmarks).not.toHaveBeenCalled()
    })

    it('maps FaceNotDetectedError and other crop failures to friendly messages', async () => {
      const { FaceNotDetectedError } = await import('@/features/registration/services/faceCropService')
      happyPath()

      faceCrop.cropFace.mockRejectedValueOnce(new FaceNotDetectedError())
      const noFace = await profileService.updatePhoto(photo, 'u1', 'org', 'wave', null, null, fresh)
      expect(noFace.bobbleheadError).toBe('No face detected in photo')

      faceCrop.cropFace.mockRejectedValueOnce(new Error('wasm crash'))
      const crash = await profileService.updatePhoto(photo, 'u1', 'org', 'wave', null, null, fresh)
      expect(crash.bobbleheadError).toBe('wasm crash')
    })
  })
})
