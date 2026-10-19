import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { kioskQrService } from './kioskQrService'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

const invoke = supabaseMock.functions.invoke

describe('kioskQrService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('generateRegistrationQR', () => {
    it('returns the QR token response', async () => {
      const data = { success: true, token: 'jwt', url: 'https://x/register?token=jwt' }
      invoke.mockResolvedValue({ data, error: null })

      await expect(kioskQrService.generateRegistrationQR()).resolves.toEqual(data)
      expect(invoke).toHaveBeenCalledWith('generate-registration-qr', { body: {} })
    })

    it('throws on a transport error', async () => {
      invoke.mockResolvedValue({ data: null, error: { message: 'offline' } })
      await expect(kioskQrService.generateRegistrationQR()).rejects.toThrow('offline')
    })

    it('throws the function error when unsuccessful', async () => {
      invoke.mockResolvedValue({ data: { success: false, error: 'not a kiosk' }, error: null })
      await expect(kioskQrService.generateRegistrationQR()).rejects.toThrow('not a kiosk')
    })
  })

  describe('verifyRegistrationToken', () => {
    it('passes the token and returns the org info', async () => {
      const data = { success: true, org_id: 'o', org_name: 'Org' }
      invoke.mockResolvedValue({ data, error: null })

      await expect(kioskQrService.verifyRegistrationToken('jwt')).resolves.toEqual(data)
      expect(invoke).toHaveBeenCalledWith('verify-registration-token', { body: { token: 'jwt' } })
    })

    it('returns an unsuccessful verification (with its error code) instead of throwing', async () => {
      const data = { success: false, error_code: 'TOKEN_EXPIRED' }
      invoke.mockResolvedValue({ data, error: null })
      await expect(kioskQrService.verifyRegistrationToken('jwt')).resolves.toEqual(data)
    })

    it('throws when the function errors or returns nothing', async () => {
      invoke.mockResolvedValueOnce({ data: null, error: { message: 'down' } })
      await expect(kioskQrService.verifyRegistrationToken('jwt')).rejects.toThrow('down')

      invoke.mockResolvedValueOnce({ data: null, error: null })
      await expect(kioskQrService.verifyRegistrationToken('jwt')).rejects.toThrow(
        'Failed to verify registration token',
      )
    })
  })
})
