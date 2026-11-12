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

    it.each([
      [400, { success: false, error: 'Token has expired', error_code: 'TOKEN_EXPIRED' }],
      [400, { success: false, error: 'Invalid token', error_code: 'INVALID_TOKEN' }],
      [404, { success: false, error: 'Organization not found', error_code: 'ORG_NOT_FOUND' }],
    ])('returns the rejection body of a %i response so the page can show the right state', async (status, body) => {
      invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Edge Function returned a non-2xx status code',
          context: new Response(JSON.stringify(body), { status }),
        },
      })
      await expect(kioskQrService.verifyRegistrationToken('jwt')).resolves.toEqual(body)
    })

    it('still throws for a non-2xx response without a typed body', async () => {
      invoke.mockResolvedValue({
        data: null,
        error: { message: 'boom', context: new Response('gateway down', { status: 502 }) },
      })
      await expect(kioskQrService.verifyRegistrationToken('jwt')).rejects.toThrow('boom')
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
