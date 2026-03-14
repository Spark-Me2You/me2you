/**
 * Mint Kiosk Session Edge Function
 *
 * This function mints a kiosk session for an admin-selected organization.
 * It performs the following steps:
 * 1. Verifies admin authentication
 * 2. Validates admin has access to the requested organization
 * 3. Looks up the global kiosk user account (kiosk@me2you.app)
 * 4. Updates kiosk user's app_metadata with org_id
 * 5. Generates a session token for the kiosk user
 * 6. Returns the token to the client
 *
 * The client is responsible for:
 * - Signing out the admin session
 * - Exchanging the token for a kiosk session
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[mint-kiosk-session] Function invoked');

    // 1. Verify admin is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user: adminUser }, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !adminUser) {
      console.error('[mint-kiosk-session] Admin auth failed:', userError);
      throw new Error('Admin authentication failed');
    }

    console.log('[mint-kiosk-session] Admin verified:', adminUser.id);

    // 2. Parse request body
    const { org_id } = await req.json();
    if (!org_id) {
      throw new Error('Missing org_id in request body');
    }

    console.log('[mint-kiosk-session] Requested org_id:', org_id);

    // 3. Verify admin has access to this org
    const { data: adminRecord, error: adminError } = await supabaseClient
      .from('admin')
      .select('org_id')
      .eq('id', adminUser.id)
      .eq('org_id', org_id)
      .single();

    if (adminError || !adminRecord) {
      console.error('[mint-kiosk-session] Admin does not have access to org:', org_id);
      throw new Error('Admin does not have access to this organization');
    }

    console.log('[mint-kiosk-session] Admin authorized for org');

    // 4. Look up kiosk user account
    const KIOSK_EMAIL = 'kiosk@me2you.app';

    // Use admin client to query auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // SERVICE ROLE KEY for admin API
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const kioskUser = users?.find(u => u.email === KIOSK_EMAIL);

    if (!kioskUser) {
      console.error('[mint-kiosk-session] Kiosk user not found:', KIOSK_EMAIL);
      throw new Error('Kiosk user account not found. Please contact administrator.');
    }

    console.log('[mint-kiosk-session] Kiosk user found:', kioskUser.id);

    // 5. Create session with custom claims (org_id injected per-session, not per-user)
    // IMPORTANT: We don't update app_metadata on the kiosk user - that would create a race condition
    // where concurrent kiosk activations overwrite each other's org_id.
    // Instead, we inject org_id directly into THIS session's JWT using custom_claims.
    // Each session gets its own independent org_id token, preventing race conditions.
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
      user_id: kioskUser.id,
      custom_claims: {
        is_kiosk: true,
        org_id: org_id,
      },
    });

    if (sessionError || !sessionData?.session) {
      console.error('[mint-kiosk-session] Failed to create session:', sessionError);
      throw new Error('Failed to create kiosk session');
    }

    console.log('[mint-kiosk-session] Kiosk session created with org_id:', org_id);
    console.log('[mint-kiosk-session] Session tokens generated for user:', kioskUser.id);

    // 6. Return session tokens
    // The client will use these tokens to establish the kiosk session
    return new Response(
      JSON.stringify({
        success: true,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        kiosk_user_id: kioskUser.id,
        org_id: org_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[mint-kiosk-session] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
