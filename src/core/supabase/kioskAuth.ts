/**
 * Kiosk Authentication Service
 *
 * Handles kiosk session operations including:
 * - Minting kiosk sessions via edge function
 * - Retrieving current kiosk session
 * - Exiting kiosk mode
 */

import { supabase } from './client';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Kiosk Session Data
 * Contains user, session, and organization information for a kiosk session
 */
export interface KioskSession {
  user: User;
  session: Session;
  org_id: string;
}

/**
 * Edge Function Response for Mint Kiosk Session
 */
interface MintKioskSessionResponse {
  success: boolean;
  kiosk_token?: string;
  kiosk_user_id?: string;
  org_id?: string;
  error?: string;
}

/**
 * Kiosk Authentication Service
 * Provides methods for managing kiosk sessions
 */
export const kioskAuthService = {
  /**
   * Mint a kiosk session for the given organization
   *
   * This method:
   * 1. Calls the edge function to mint a kiosk session
   * 2. Receives a kiosk token from the edge function
   * 3. Signs out the current admin session
   * 4. Exchanges the kiosk token for a session
   * 5. Returns the kiosk session data
   *
   * @param orgId - The organization ID to scope the kiosk session to
   * @returns Promise<KioskSession> - The kiosk session data
   * @throws Error if minting fails at any step
   */
  mintKioskSession: async (orgId: string): Promise<KioskSession> => {
    console.log('[kioskAuth] Minting kiosk session for org:', orgId);

    // 1. Call edge function to mint kiosk session
    const { data, error } = await supabase.functions.invoke<MintKioskSessionResponse>(
      'mint-kiosk-session',
      {
        body: { org_id: orgId },
      }
    );

    if (error || !data || !data.success) {
      console.error('[kioskAuth] Edge function error:', error || data?.error);
      throw new Error(data?.error || 'Failed to mint kiosk session');
    }

    console.log('[kioskAuth] Edge function returned token for user:', data.kiosk_user_id);

    // 2. Sign out current admin session
    console.log('[kioskAuth] Signing out admin session');
    await supabase.auth.signOut();
    console.log('[kioskAuth] Admin signed out');

    // 3. Exchange kiosk token for session
    // Note: We use verifyOtp to exchange the magic link token for a session
    console.log('[kioskAuth] Exchanging token for kiosk session');

    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.kiosk_token!,
      type: 'magiclink',
    });

    if (sessionError || !sessionData.session) {
      console.error('[kioskAuth] Token exchange failed:', sessionError);
      throw new Error('Failed to exchange kiosk token for session');
    }

    console.log('[kioskAuth] Kiosk session established');
    console.log('[kioskAuth] Kiosk user ID:', sessionData.user.id);
    console.log('[kioskAuth] Kiosk org_id from metadata:', sessionData.user.app_metadata.org_id);

    // 4. Return kiosk session
    return {
      user: sessionData.user,
      session: sessionData.session,
      org_id: data.org_id!,
    };
  },

  /**
   * Get current kiosk session
   *
   * Checks if the current session is a kiosk session by inspecting app_metadata.
   * A session is considered a kiosk session if:
   * - It has app_metadata.is_kiosk === true
   * - It has app_metadata.org_id set
   *
   * @returns Promise<KioskSession | null> - The kiosk session data or null if not a kiosk session
   */
  getCurrentKioskSession: async (): Promise<KioskSession | null> => {
    console.log('[kioskAuth] Checking for current kiosk session');

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.log('[kioskAuth] No session found');
      return null;
    }

    const { is_kiosk, org_id } = session.user.app_metadata;

    if (!is_kiosk || !org_id) {
      console.log('[kioskAuth] Current session is not a kiosk session');
      return null;
    }

    console.log('[kioskAuth] Kiosk session found for org:', org_id);

    return {
      user: session.user,
      session,
      org_id,
    };
  },

  /**
   * Exit kiosk mode
   *
   * Signs out the current kiosk session and returns to unauthenticated state.
   *
   * @throws Error if sign out fails
   */
  exitKioskMode: async (): Promise<void> => {
    console.log('[kioskAuth] Exiting kiosk mode');

    await supabase.auth.signOut();

    console.log('[kioskAuth] Kiosk session signed out');
  },
};
