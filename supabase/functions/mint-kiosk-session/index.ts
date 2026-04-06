/**
 * Mint Kiosk Session Edge Function
 *
 * This function mints a kiosk session for an admin-selected organization.
 * It performs the following steps:
 * 1. Validates admin JWT via RLS query (Gatekeeper pattern)
 * 2. Validates admin has access to the requested organization
 * 3. Looks up the global kiosk user account (kiosk@me2you.app)
 * 4. Updates kiosk user's app_metadata with org_id
 * 5. Generates session via magic link + OTP verification
 * 6. Returns access_token and refresh_token to the client
 *
 * SECURITY:
 * - RLS is the single source of truth for admin access control
 * - Service role only used AFTER RLS verification passes
 * - JWT validated via RLS query (--no-verify-jwt flag required)
 *
 * RACE CONDITION NOTE:
 * There's a brief (~100-400ms) race condition window when updating app_metadata.
 * If two admins activate kiosk mode for different orgs within this window,
 * one may get the wrong org_id. For typical kiosk usage, this is acceptable.
 *
 * Environment variables are auto-provided by Supabase:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * The client is responsible for:
 * - Signing out the admin session
 * - Setting the kiosk session using the returned tokens
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

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

    // 1. Get Authorization header (validated by Supabase if verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[mint-kiosk-session] No Authorization header');
      throw new Error('Missing authorization header');
    }

    console.log('[mint-kiosk-session] Authorization header present');

    // 2. Parse request body
    const { org_id } = await req.json();
    if (!org_id) {
      console.error('[mint-kiosk-session] No org_id in request body');
      throw new Error('Missing org_id in request body');
    }

    // Validate org_id format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(org_id)) {
      console.error('[mint-kiosk-session] Invalid org_id format:', org_id);
      throw new Error('Invalid organization ID format');
    }

    console.log('[mint-kiosk-session] Requested org_id:', org_id);

    // 3. THE RLS GATE: Create client with ANON key + Admin's JWT
    // This client respects RLS policies
    // PostgREST requires both Authorization (JWT) and apikey headers
    const supabaseRLS = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
            apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          },
        },
      }
    );

    // 4. RLS verification:
    //    - First, verify the JWT and get the caller's user id
    console.log('[mint-kiosk-session] Fetching authenticated user via RLS client...');
    const { data: authUserResult, error: authUserError } = await supabaseRLS.auth.getUser();

    if (authUserError || !authUserResult?.user) {
      console.error('[mint-kiosk-session] Failed to retrieve authenticated user:', authUserError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or missing authentication',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = authUserResult.user;

    //    - Then, verify that this user is an admin for the requested org_id
    console.log('[mint-kiosk-session] Verifying admin access via RLS...');

    const { data: adminCheck, error: rlsError } = await supabaseRLS
      .from('admin')
      .select('id')
      .eq('org_id', org_id)
      .eq('id', user.id)
      .maybeSingle();

    if (rlsError || !adminCheck) {
      console.error('[mint-kiosk-session] RLS gate failed:', rlsError?.message);
      console.error('[mint-kiosk-session] Admin does not have access to org:', org_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized for this organization',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[mint-kiosk-session] RLS gate passed - admin authorized');

    // 5. THE HANDOFF: Use service role to mint kiosk session
    // Admin's token is discarded after RLS gate - we only use service role from here
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 6. Look up the global kiosk user account by email
    const KIOSK_EMAIL = 'kiosk@me2you.app';
    console.log('[mint-kiosk-session] Looking up kiosk user:', KIOSK_EMAIL);

    // Search through all users with pagination to find kiosk user
    let kioskUser = null;
    let page = 1;
    const perPage = 1000; // Max per page

    while (!kioskUser) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error('[mint-kiosk-session] Error listing users:', listError);
        throw new Error('Failed to list users while looking up kiosk account.');
      }

      const users = data?.users ?? [];

      // Search for kiosk user in this page
      kioskUser = users.find((u) => u.email === KIOSK_EMAIL);

      // If we found the user or there are no more pages, break
      if (kioskUser || users.length < perPage) {
        break;
      }

      page++;
    }

    if (!kioskUser) {
      console.error('[mint-kiosk-session] Kiosk user not found:', KIOSK_EMAIL);
      throw new Error('Kiosk user account not found. Please contact administrator.');
    }

    console.log('[mint-kiosk-session] Kiosk user found:', kioskUser.id);

    // 7. Update kiosk user's app_metadata with org_id for THIS session
    // Note: This creates a brief race condition window, but for kiosk use it's acceptable
    // The org_id will be included in the JWT when we generate the session
    console.log('[mint-kiosk-session] Updating kiosk user app_metadata with org_id...');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      kioskUser.id,
      {
        app_metadata: {
          is_kiosk: true,
          org_id: org_id,
        },
      }
    );

    if (updateError) {
      console.error('[mint-kiosk-session] Failed to update user metadata:', updateError);
      throw new Error('Failed to configure kiosk session');
    }

    console.log('[mint-kiosk-session] Kiosk user app_metadata updated');

    // 8. Generate a magic link to create a session for the kiosk user
    // The magic link contains tokens we can extract
    console.log('[mint-kiosk-session] Generating kiosk session via magic link...');

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: KIOSK_EMAIL,
    });

    if (linkError || !linkData) {
      console.error('[mint-kiosk-session] Failed to generate magic link:', linkError);
      throw new Error('Failed to generate kiosk session');
    }

    console.log('[mint-kiosk-session] Magic link generated');

    // Extract the token from the link properties
    const token = linkData.properties?.hashed_token;

    if (!token) {
      console.error('[mint-kiosk-session] No token in magic link response');
      throw new Error('Failed to extract session token');
    }

    // 9. Verify the OTP to get actual session tokens
    console.log('[mint-kiosk-session] Verifying token to get session...');

    const { data: sessionData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    });

    if (verifyError || !sessionData?.session) {
      console.error('[mint-kiosk-session] Failed to verify token:', verifyError);
      throw new Error('Failed to create kiosk session');
    }

    console.log('[mint-kiosk-session] Kiosk session created with org_id:', org_id);
    console.log('[mint-kiosk-session] Session tokens generated for user:', kioskUser.id);

    const access_token = sessionData.session.access_token;
    const refresh_token = sessionData.session.refresh_token;

    // 8. Return kiosk tokens to client
    // The client will use these tokens to establish the kiosk session
    return new Response(
      JSON.stringify({
        success: true,
        access_token,
        refresh_token,
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
