/**
 * Kiosk QR Service
 * Handles generation of registration QR codes for kiosks
 */

import { supabase } from './client';

/**
 * Response from generate-registration-qr edge function
 */
export interface GenerateQRResponse {
  success: boolean;
  token?: string;
  url?: string;
  expires_at?: number;
  expires_in_seconds?: number;
  error?: string;
}

/**
 * Response from verify-registration-token edge function
 */
export interface VerifyTokenResponse {
  success: boolean;
  org_id?: string;
  org_name?: string;
  error?: string;
  error_code?: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'MISSING_TOKEN' | 'INVALID_PAYLOAD' | 'ORG_NOT_FOUND' | 'SERVER_ERROR';
}

export const kioskQrService = {
  /**
   * Generate a registration QR code token
   * Must be called from an authenticated kiosk session
   *
   * @returns QR code token and URL
   * @throws Error if not authenticated as kiosk or generation fails
   */
  generateRegistrationQR: async (): Promise<GenerateQRResponse> => {
    const { data, error } = await supabase.functions.invoke<GenerateQRResponse>('generate-registration-qr', {
      body: {},
    });

    if (error) {
      console.error('[kioskQrService] Error invoking generate-registration-qr:', error);
      throw new Error(error.message || 'Failed to generate QR code');
    }

    if (!data || !data.success) {
      console.error('[kioskQrService] Edge function returned error:', data?.error);
      throw new Error(data?.error || 'Failed to generate QR code');
    }

    return data;
  },

  /**
   * Verify a registration token
   * Called by registration page to validate QR code token
   *
   * @param token - JWT token from QR code
   * @returns Organization ID and name if valid
   * @throws Error if verification fails
   */
  verifyRegistrationToken: async (token: string): Promise<VerifyTokenResponse> => {
    const { data, error } = await supabase.functions.invoke<VerifyTokenResponse>('verify-registration-token', {
      body: { token },
    });

    if (error) {
      console.error('[kioskQrService] Error invoking verify-registration-token:', error);
      throw new Error(error.message || 'Failed to verify registration token');
    }

    if (!data) {
      console.error('[kioskQrService] No data returned from verify-registration-token');
      throw new Error('Failed to verify registration token');
    }

    return data;
  },
};
