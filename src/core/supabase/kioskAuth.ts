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
  access_token?: string;
  refresh_token?: string;
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
   * 1. Calls the edge function to create a kiosk session with org_id in app_metadata
   * 2. Receives access_token and refresh_token from the edge function
   * 3. Signs out the current admin session
   * 4. Sets the kiosk session using the tokens
   * 5. Returns the kiosk session data
   *
   * NOTE: The edge function updates the kiosk user's app_metadata with org_id,
   * then generates a session. There's a brief race condition window (~100-400ms)
   * if two admins activate kiosk mode simultaneously for different orgs.
   * For typical kiosk usage, this is acceptable.
   *
   * @param orgId - The organization ID to scope the kiosk session to
   * @returns Promise<KioskSession> - The kiosk session data
   * @throws Error if minting fails at any step
   */
  mintKioskSession: async (orgId: string): Promise<KioskSession> => {
    console.log('[kioskAuth] Minting kiosk session for org:', orgId);

    // 1. Call edge function to create kiosk session
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

    console.log('[kioskAuth] Edge function returned session for user:', data.kiosk_user_id);

    // 2. Sign out current admin session
    console.log('[kioskAuth] Signing out admin session');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('[kioskAuth] Failed to sign out admin session:', signOutError);
      throw new Error('Failed to sign out admin session before entering kiosk mode');
    }
    console.log('[kioskAuth] Admin signed out');

    // 3. Set the kiosk session using the tokens from the edge function
    console.log('[kioskAuth] Setting kiosk session with access and refresh tokens');

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token!,
      refresh_token: data.refresh_token!,
    });

    if (sessionError || !sessionData.session || !sessionData.user) {
      console.error('[kioskAuth] Failed to set kiosk session:', sessionError);
      throw new Error('Failed to set kiosk session');
    }

    console.log('[kioskAuth] Kiosk session established');
    console.log('[kioskAuth] Kiosk user ID:', sessionData.user.id);
    console.log('[kioskAuth] Kiosk org_id from app_metadata:', sessionData.user.app_metadata?.org_id);

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

    // Kiosk claims are in app_metadata (set by edge function)
    const { is_kiosk, org_id } = session.user.app_metadata || {};

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
