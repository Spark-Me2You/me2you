import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/core/auth/AuthContext'
import { userRegistrationAuthService } from '@/core/supabase/userRegistrationAuth'
import { silenceConsole } from '@/test/console'
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { faceCropService } from '../services/faceCropService'
import { registrationService } from '../services/registrationService'
import { useRegistration } from './useRegistration'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
vi.mock('@/core/auth/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../context/RegistrationContext', () => ({
  useRegistrationContext: () => ({ org_id: 'org-1', org_name: 'Org' }),
}))
vi.mock('@/core/supabase/userRegistrationAuth', () => ({
  userRegistrationAuthService: {
    createMinimalUserRecord: vi.fn(),
    checkOnboardingComplete: vi.fn(),
    updateUserProfile: vi.fn(),
    signOut: vi.fn(),
  },
}))
vi.mock('../services/registrationService', () => ({
  registrationService: { uploadGesturePhoto: vi.fn(), uploadCroppedPhotoWithLandmarks: vi.fn() },
}))
vi.mock('../services/faceCropService', () => ({ faceCropService: { cropFace: vi.fn() } }))

const regAuth = vi.mocked(userRegistrationAuthService)
const regService = vi.mocked(registrationService)
const faceCrop = vi.mocked(faceCropService)

const signUpUser = vi.fn()
const signInUser = vi.fn()
const setUserProfile = vi.fn()
const user = { id: 'u1' }

function setup() {
  return renderHook(() => useRegistration())
}

describe('useRegistration', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    vi.mocked(useAuth).mockReturnValue({ signUpUser, signInUser, setUserProfile } as never)
    for (const fn of [signUpUser, signInUser, setUserProfile]) fn.mockReset()
    for (const fn of [...Object.values(regAuth), ...Object.values(regService), faceCrop.cropFace]) {
      vi.mocked(fn).mockReset()
    }
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user } })
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  describe('navigation', () => {
    it('starts on signup and walks forward and back through the steps', () => {
      const { result } = setup()
      expect(result.current).toMatchObject({ currentStep: 'signup', isFirstStep: true, isLastStep: false })

      act(() => result.current.nextStep())
      expect(result.current.currentStep).toBe('profile')
      act(() => result.current.nextStep())
      act(() => result.current.nextStep())
      act(() => result.current.nextStep())
      expect(result.current).toMatchObject({ currentStep: 'success', isLastStep: true })

      act(() => result.current.nextStep()) // clamped
      expect(result.current.currentStep).toBe('success')

      act(() => result.current.goToStep('photo'))
      act(() => result.current.previousStep())
      expect(result.current.currentStep).toBe('profile')
    })

    it('previousStep is a no-op on the first step', () => {
      const { result } = setup()
      act(() => result.current.previousStep())
      expect(result.current.currentStep).toBe('signup')
    })

    it('merges form data and clears errors', async () => {
      const { result } = setup()
      act(() => result.current.updateFormData({ name: 'Ann' }))
      act(() => result.current.updateFormData({ major: 'CS' }))
      expect(result.current.formData).toEqual({ name: 'Ann', major: 'CS' })

      await act(async () => { await result.current.handleProfileSubmit() }) // name ok, no error
      act(() => result.current.goToStep('profile'))
      expect(result.current.error).toBeNull()
    })
  })

  describe('handleSignUp', () => {
    it('signs up, creates the minimal record with the QR org and advances', async () => {
      const { result } = setup()
      let ok = false
      await act(async () => { ok = await result.current.handleSignUp('a@x.com', 'pw') })

      expect(ok).toBe(true)
      expect(signUpUser).toHaveBeenCalledWith('a@x.com', 'pw')
      expect(regAuth.createMinimalUserRecord).toHaveBeenCalledWith('u1', 'org-1')
      expect(result.current.currentStep).toBe('profile')
      expect(result.current.formData).toMatchObject({ email: 'a@x.com', password: 'pw' })
    })

    it('shows an ordinary signup error as-is', async () => {
      signUpUser.mockRejectedValue(new Error('Password too short'))
      const { result } = setup()
      let ok = true
      await act(async () => { ok = await result.current.handleSignUp('a@x.com', 'pw') })

      expect(ok).toBe(false)
      expect(result.current.error).toBe('Password too short')
      expect(result.current.currentStep).toBe('signup')
      expect(result.current.isSubmitting).toBe(false)
    })

    describe('rescue flow for an existing account', () => {
      const existing = () => Object.assign(new Error('User already registered'), { code: 'user_already_exists' })

      it('resumes an account with unfinished onboarding', async () => {
        signUpUser.mockRejectedValue(existing())
        supabaseMock.auth.getUser.mockResolvedValue({ data: { user } })
        regAuth.checkOnboardingComplete.mockResolvedValue(false)
        const { result } = setup()

        let ok = false
        await act(async () => { ok = await result.current.handleSignUp('a@x.com', 'pw') })

        expect(ok).toBe(true)
        expect(signInUser).toHaveBeenCalledWith('a@x.com', 'pw')
        expect(result.current.currentStep).toBe('profile')
      })

      it('signs out and points a finished account to login', async () => {
        signUpUser.mockRejectedValue(existing())
        regAuth.checkOnboardingComplete.mockResolvedValue(true)
        const { result } = setup()

        let ok = true
        await act(async () => { ok = await result.current.handleSignUp('a@x.com', 'pw') })

        expect(ok).toBe(false)
        expect(regAuth.signOut).toHaveBeenCalled()
        expect(result.current.error).toBe('Account already exists. Please log in instead.')
      })

      it('signs out when the profile row is missing', async () => {
        signUpUser.mockRejectedValue(existing())
        regAuth.checkOnboardingComplete.mockResolvedValue(null as never)
        const { result } = setup()

        await act(async () => { await result.current.handleSignUp('a@x.com', 'pw') })

        expect(regAuth.signOut).toHaveBeenCalled()
        expect(result.current.error).toMatch(/profile not found/)
      })

      it('does not reveal whether the email exists when the password is wrong', async () => {
        signUpUser.mockRejectedValue(existing())
        signInUser.mockRejectedValue(new Error('Invalid login credentials'))
        const { result } = setup()

        await act(async () => { await result.current.handleSignUp('a@x.com', 'wrong') })

        expect(result.current.error).toBe('Invalid email or password.')
        expect(regAuth.checkOnboardingComplete).not.toHaveBeenCalled()
      })

      it.each([
        ['a unique-violation code', Object.assign(new Error('dup'), { code: '23505' })],
        ['an "already registered" message', new Error('Email already registered')],
      ])('also triggers on %s', async (_l, error) => {
        signUpUser.mockRejectedValue(error)
        signInUser.mockRejectedValue(new Error('x'))
        const { result } = setup()
        await act(async () => { await result.current.handleSignUp('a@x.com', 'pw') })
        expect(signInUser).toHaveBeenCalled()
      })
    })
  })

  describe('handleProfileSubmit', () => {
    it('requires a non-blank name', async () => {
      const { result } = setup()
      act(() => result.current.updateFormData({ name: '   ' }))
      let ok = true
      await act(async () => { ok = await result.current.handleProfileSubmit() })

      expect(ok).toBe(false)
      expect(result.current.error).toBe('Name is required')
    })

    it('advances to the photo step with a name', async () => {
      const { result } = setup()
      act(() => result.current.goToStep('profile'))
      act(() => result.current.updateFormData({ name: 'Ann' }))
      await act(async () => { await result.current.handleProfileSubmit() })
      expect(result.current.currentStep).toBe('photo')
    })
  })

  describe('handlePhotoSubmit', () => {
    const photo = new Blob(['p'])
    const cropped = new Blob(['c'])
    const profile = { id: 'u1', name: 'Ann' }

    function ready() {
      regAuth.updateUserProfile.mockResolvedValue(profile as never)
      regService.uploadGesturePhoto.mockResolvedValue({ id: 'img1' } as never)
      faceCrop.cropFace.mockResolvedValue({ croppedBlob: cropped, cropMetadata: { landmarks: { a: 1 } } } as never)
      const hook = setup()
      act(() => hook.result.current.goToStep('photo'))
      act(() => hook.result.current.updateFormData({ name: ' Ann ', status: '  ', major: 'CS', interests: ['x'] }))
      return hook
    }

    it('rejects a missing photo', async () => {
      const { result } = setup()
      let ok = true
      await act(async () => { ok = await result.current.handlePhotoSubmit(null, 'wave') })
      expect(ok).toBe(false)
      expect(result.current.error).toBe('Please take a photo')
    })

    it('saves the trimmed profile, uploads, crops and advances to bobblehead', async () => {
      const { result } = ready()
      let ok = false
      await act(async () => { ok = await result.current.handlePhotoSubmit(photo, 'peace_sign') })

      expect(ok).toBe(true)
      expect(regAuth.updateUserProfile).toHaveBeenCalledWith('u1', {
        name: 'Ann',
        status: null,
        pronouns: null,
        major: 'CS',
        interests: ['x'],
      })
      expect(setUserProfile).toHaveBeenCalledWith(profile)
      expect(regService.uploadGesturePhoto).toHaveBeenCalledWith(photo, 'u1', 'org-1', 'peace_sign')
      expect(result.current.result).toEqual({ user, profile, imageId: 'img1' })
      expect(result.current.croppedPhotoUrl).toBe('blob:preview')
      expect(result.current.currentStep).toBe('bobblehead')
    })

    it('reports a crop failure and stays on the photo step', async () => {
      const { result } = ready()
      faceCrop.cropFace.mockRejectedValue(new Error('No face detected'))
      let ok = true
      await act(async () => { ok = await result.current.handlePhotoSubmit(photo, 'wave') })

      expect(ok).toBe(false)
      expect(result.current.error).toBe('No face detected')
      expect(result.current.currentStep).toBe('photo')
    })

    it('fails when not signed in or when the name is missing', async () => {
      const { result } = setup()
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
      await act(async () => { await result.current.handlePhotoSubmit(photo, 'wave') })
      expect(result.current.error).toBe('User not authenticated')

      supabaseMock.auth.getUser.mockResolvedValue({ data: { user } })
      await act(async () => { await result.current.handlePhotoSubmit(photo, 'wave') })
      expect(result.current.error).toBe('Name is required')
    })

    it('revokes the preview URL on unmount', async () => {
      const { result, unmount } = ready()
      await act(async () => { await result.current.handlePhotoSubmit(photo, 'wave') })
      unmount()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    })
  })

  describe('handleBobbleheadSubmit', () => {
    async function atBobblehead() {
      regAuth.updateUserProfile.mockResolvedValue({ id: 'u1' } as never)
      regService.uploadGesturePhoto.mockResolvedValue({ id: 'img1' } as never)
      faceCrop.cropFace.mockResolvedValue({
        croppedBlob: new Blob(['c']),
        cropMetadata: { landmarks: { a: 1 } },
      } as never)
      const hook = setup()
      act(() => hook.result.current.updateFormData({ name: 'Ann' }))
      await act(async () => { await hook.result.current.handlePhotoSubmit(new Blob(['p']), 'wave') })
      return hook
    }

    it('uploads the cropped photo with landmarks when joining the network', async () => {
      const { result } = await atBobblehead()
      let ok = false
      await act(async () => { ok = await result.current.handleBobbleheadSubmit(true) })

      expect(ok).toBe(true)
      expect(regService.uploadCroppedPhotoWithLandmarks).toHaveBeenCalledWith(expect.any(Blob), 'u1', 'org-1', { a: 1 })
      expect(result.current.registrationComplete).toBe(true)
    })

    it('skips the upload but still completes when declining', async () => {
      const { result } = await atBobblehead()
      await act(async () => { await result.current.handleBobbleheadSubmit(false) })

      expect(regService.uploadCroppedPhotoWithLandmarks).not.toHaveBeenCalled()
      expect(result.current.registrationComplete).toBe(true)
    })

    it('reports an upload failure and does not complete', async () => {
      const { result } = await atBobblehead()
      regService.uploadCroppedPhotoWithLandmarks.mockRejectedValue(new Error('storage down'))
      let ok = true
      await act(async () => { ok = await result.current.handleBobbleheadSubmit(true) })

      expect(ok).toBe(false)
      expect(result.current.error).toBe('storage down')
      expect(result.current.registrationComplete).toBe(false)
    })
  })
})
