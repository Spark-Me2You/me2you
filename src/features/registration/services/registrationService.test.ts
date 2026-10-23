import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageService } from '@/core/supabase/storage'
import { userRegistrationAuthService } from '@/core/supabase/userRegistrationAuth'
import { registrationService } from './registrationService'

vi.mock('@/core/supabase/storage', () => ({
  storageService: { uploadPhoto: vi.fn(), uploadCroppedPhoto: vi.fn() },
}))
vi.mock('@/core/supabase/userRegistrationAuth', () => ({
  userRegistrationAuthService: {
    signUp: vi.fn(),
    createUserProfile: vi.fn(),
    createImageRecord: vi.fn(),
    createGestureImageRecord: vi.fn(),
    createCroppedImageRecord: vi.fn(),
  },
}))

const auth = vi.mocked(userRegistrationAuthService)
const storage = vi.mocked(storageService)

const user = { id: 'u1' } as never
const profile = { id: 'u1', name: 'Ann' } as never
const photo = new Blob(['x'])

describe('registrationService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    auth.signUp.mockResolvedValue({ user } as never)
    auth.createUserProfile.mockResolvedValue(profile)
    storage.uploadPhoto.mockResolvedValue('org/u1/p.jpg')
    auth.createImageRecord.mockResolvedValue({ id: 'img1', storage_path: 'org/u1/p.jpg' })
  })

  it('signUp returns just the user', async () => {
    await expect(registrationService.signUp('a@x.com', 'pw')).resolves.toBe(user)
    expect(auth.signUp).toHaveBeenCalledWith('a@x.com', 'pw')
  })

  it('createProfile attaches the org id from the QR token', async () => {
    await registrationService.createProfile({ name: 'Ann' } as never, 'org-1')
    expect(auth.createUserProfile).toHaveBeenCalledWith({ name: 'Ann', org_id: 'org-1' })
  })

  describe('uploadPhotoAndCreateRecord', () => {
    it('uploads, then records the path as a public image defaulting to wave', async () => {
      const result = await registrationService.uploadPhotoAndCreateRecord(photo, 'u1', 'org')

      expect(storage.uploadPhoto).toHaveBeenCalledWith(photo, 'u1', 'org')
      expect(auth.createImageRecord).toHaveBeenCalledWith({
        owner_id: 'u1',
        org_id: 'org',
        storage_path: 'org/u1/p.jpg',
        category: 'wave',
        is_public: true,
      })
      expect(result).toEqual({ id: 'img1', storage_path: 'org/u1/p.jpg' })
    })

    it('does not create a record if the upload fails', async () => {
      storage.uploadPhoto.mockRejectedValue(new Error('upload failed'))
      await expect(registrationService.uploadPhotoAndCreateRecord(photo, 'u1', 'org')).rejects.toThrow('upload failed')
      expect(auth.createImageRecord).not.toHaveBeenCalled()
    })
  })

  it('uploadGesturePhoto records a gesture_image with the given category', async () => {
    auth.createGestureImageRecord.mockResolvedValue({ id: 'g1', storage_path: 'org/u1/p.jpg' })

    await registrationService.uploadGesturePhoto(photo, 'u1', 'org', 'peace_sign')

    expect(auth.createGestureImageRecord).toHaveBeenCalledWith({
      owner_id: 'u1',
      org_id: 'org',
      storage_path: 'org/u1/p.jpg',
      category: 'peace_sign',
      is_public: true,
    })
  })

  it('uploadCroppedPhotoWithLandmarks stores the cropped file under a fresh name and keeps the landmarks', async () => {
    storage.uploadCroppedPhoto.mockResolvedValue('org/u1/x_cropped.png')
    auth.createCroppedImageRecord.mockResolvedValue({ id: 'c1', storage_path: 'org/u1/x_cropped.png' })
    const landmarks = { centroid: { x: 0.5, y: 0.5 } } as never

    await registrationService.uploadCroppedPhotoWithLandmarks(photo, 'u1', 'org', landmarks)

    expect(storage.uploadCroppedPhoto).toHaveBeenCalledWith(photo, 'u1', 'org', expect.stringMatching(/^[0-9a-f-]{36}$/))
    expect(auth.createCroppedImageRecord).toHaveBeenCalledWith({
      owner_id: 'u1',
      org_id: 'org',
      storage_path: 'org/u1/x_cropped.png',
      landmarks,
      is_public: true,
    })
  })

  describe('completeRegistration', () => {
    const form = { email: 'a@x.com', password: 'pw', name: 'Ann' }

    it('signs up, creates the profile with empty optionals as null, and skips the photo if none given', async () => {
      const result = await registrationService.completeRegistration(form, 'org')

      expect(auth.createUserProfile).toHaveBeenCalledWith({
        name: 'Ann',
        status: null,
        pronouns: null,
        major: null,
        interests: null,
        org_id: 'org',
      })
      expect(storage.uploadPhoto).not.toHaveBeenCalled()
      expect(result).toEqual({ user, profile, imageId: undefined })
    })

    it('uploads the photo for the new user and returns its image id', async () => {
      const result = await registrationService.completeRegistration({ ...form, photo }, 'org')

      expect(storage.uploadPhoto).toHaveBeenCalledWith(photo, 'u1', 'org')
      expect(result.imageId).toBe('img1')
    })

    it('stops at the first failing step', async () => {
      auth.signUp.mockRejectedValue(new Error('email taken'))

      await expect(registrationService.completeRegistration(form, 'org')).rejects.toThrow('email taken')
      expect(auth.createUserProfile).not.toHaveBeenCalled()
    })
  })
})
