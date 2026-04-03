/**
 * Generate Registration QR Edge Function
 *
 * This function generates a signed JWT token for QR-code based registration.
 * It performs the following steps:
 * 1. Validates caller is an authenticated kiosk (via app_metadata.is_kiosk)
 * 2. Extracts org_id from kiosk's app_metadata
 * 3. Generates a JWT token (HS256) with 5-minute expiration
 * 4. Returns token and full registration URL
 *
 * SECURITY:
 * - Only kiosk accounts can generate tokens
 * - Tokens expire after 5 minutes
 * - Tokens are signed with HS256 using QR_TOKEN_SECRET
 * - Multi-use tokens (can be scanned by multiple users until expiry)
 *
 * Environment variables (auto-provided by Supabase):
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - QR_TOKEN_SECRET (custom secret, must be set in Supabase dashboard)
 * - APP_BASE_URL (custom secret, e.g., "https://me2you.app")
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
    console.log('[generate-registration-qr] Function invoked');

    // 1. Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[generate-registration-qr] No Authorization header');
      throw new Error('Missing authorization header');
    }

    console.log('[generate-registration-qr] Authorization header present');

    // 2. Create Supabase client with caller's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // 3. Verify caller is authenticated
    console.log('[generate-registration-qr] Fetching authenticated user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[generate-registration-qr] Failed to retrieve authenticated user:', authError?.message);
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

    console.log('[generate-registration-qr] User authenticated:', user.id);

    // 4. Verify caller is a kiosk account
    const { is_kiosk, org_id } = user.app_metadata || {};

    if (!is_kiosk) {
      console.error('[generate-registration-qr] User is not a kiosk account');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only kiosk accounts can generate registration QR codes',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!org_id) {
      console.error('[generate-registration-qr] Kiosk account has no org_id in app_metadata');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Kiosk account is not associated with an organization',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[generate-registration-qr] Kiosk authorized for org:', org_id);

    // 5. Generate JWT token
    const secret = new TextEncoder().encode(Deno.env.get('QR_TOKEN_SECRET'));
    if (!secret) {
      console.error('[generate-registration-qr] QR_TOKEN_SECRET not configured');
      throw new Error('Server configuration error: QR_TOKEN_SECRET not set');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300; // 5 minutes from now

    console.log('[generate-registration-qr] Generating JWT...');

    const token = await new jose.SignJWT({
      sub: org_id, // Organization ID
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setIssuer('me2you-kiosk')
      .sign(secret);

    console.log('[generate-registration-qr] JWT generated');

    // 6. Build registration URL
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
    const registrationUrl = `${baseUrl}/register?token=${token}`;

    console.log('[generate-registration-qr] Registration URL created');

    // 7. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        token,
        url: registrationUrl,
        expires_at: exp,
        expires_in_seconds: 300,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[generate-registration-qr] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
