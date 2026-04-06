/**
 * Verify Registration Token Edge Function
 *
 * This function verifies a registration token and returns organization information.
 * It performs the following steps:
 * 1. Receives token from request body
 * 2. Verifies JWT signature and expiration
 * 3. Extracts org_id from token payload
 * 4. Fetches organization details from database
 * 5. Returns org_id and org_name for registration
 *
 * SECURITY:
 * - Server-side JWT validation is authoritative
 * - Uses service role to query organization table
 * - Returns specific error codes for different failure scenarios
 *
 * Environment variables (auto-provided by Supabase):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - QR_TOKEN_SECRET (custom secret)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

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
    console.log('[verify-registration-token] Function invoked');

    // 1. Parse request body
    const { token } = await req.json();

    if (!token) {
      console.error('[verify-registration-token] No token in request body');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing registration token',
          error_code: 'MISSING_TOKEN',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[verify-registration-token] Token received');

    // 2. Verify JWT
    const secret = new TextEncoder().encode(Deno.env.get('QR_TOKEN_SECRET'));
    if (!secret) {
      console.error('[verify-registration-token] QR_TOKEN_SECRET not configured');
      throw new Error('Server configuration error: QR_TOKEN_SECRET not set');
    }

    let payload;
    try {
      console.log('[verify-registration-token] Verifying JWT signature and expiration...');
      const { payload: p } = await jose.jwtVerify(token, secret, {
        issuer: 'me2you-kiosk',
      });
      payload = p;
      console.log('[verify-registration-token] JWT verified successfully');
    } catch (jwtError) {
      console.error('[verify-registration-token] JWT verification failed:', jwtError.message);

      // Provide specific error for expired tokens
      if (jwtError.code === 'ERR_JWT_EXPIRED') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'QR code has expired. Please scan a new code at the kiosk.',
            error_code: 'TOKEN_EXPIRED',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Generic error for other JWT issues (invalid signature, malformed, etc.)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid QR code. Please scan a new code at the kiosk.',
          error_code: 'INVALID_TOKEN',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Extract org_id from payload
    const org_id = payload.sub;

    if (!org_id) {
      console.error('[verify-registration-token] No org_id in token payload');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid QR code format. Please scan a new code.',
          error_code: 'INVALID_PAYLOAD',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[verify-registration-token] Extracted org_id:', org_id);

    // 4. Fetch organization details using service role
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

    console.log('[verify-registration-token] Fetching organization details...');

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organization')
      .select('id, name')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      console.error('[verify-registration-token] Organization not found:', org_id, orgError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Organization not found. Please contact support.',
          error_code: 'ORG_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[verify-registration-token] Organization found:', org.name);

    // 5. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        org_id: org.id,
        org_name: org.name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[verify-registration-token] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        error_code: 'SERVER_ERROR',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
