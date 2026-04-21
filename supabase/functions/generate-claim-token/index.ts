/**
 * Generate Claim Token Edge Function
 *
 * Called by an authenticated kiosk to create a one-time claim token.
 * Returns a claim URL and expiry — the kiosk renders the QR client-side.
 *
 * SECURITY:
 * - Only kiosk accounts can call this (verified via app_metadata.is_kiosk)
 * - org_id is always read from the kiosk JWT, never from the request body
 * - Tokens expire after 5 minutes
 *
 * Environment variables:
 * - SUPABASE_URL, SUPABASE_ANON_KEY (auto-provided)
 * - APP_BASE_URL (custom secret, e.g. "https://me2you.app")
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[generate-claim-token] Function invoked');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Caller-authenticated client — respects the kiosk's RLS context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[generate-claim-token] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { is_kiosk, org_id } = user.app_metadata || {};

    if (!is_kiosk) {
      console.error('[generate-claim-token] Caller is not a kiosk account');
      return new Response(
        JSON.stringify({ success: false, error: 'Only kiosk accounts can generate claim tokens' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org_id) {
      console.error('[generate-claim-token] Kiosk has no org_id in app_metadata');
      return new Response(
        JSON.stringify({ success: false, error: 'Kiosk has no associated organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate the payload envelope
    let body: { payload?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = body.payload as Record<string, unknown> | undefined;

    if (
      !payload ||
      typeof payload.version !== 'string' ||
      typeof payload.type !== 'string' ||
      typeof payload.data !== 'object' ||
      payload.data === null
    ) {
      return new Response(
        JSON.stringify({ success: false, error: 'payload must have version, type, display, and data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const display = payload.display as Record<string, unknown> | undefined;
    if (!display || typeof display.title !== 'string' || typeof display.description !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'payload.display must have title and description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-claim-token] Inserting token for org:', org_id, 'type:', payload.type);

    // Insert using the kiosk's JWT — the RLS INSERT policy validates org_id matches JWT app_metadata
    const { data: token, error: insertError } = await supabase
      .from('claim_tokens')
      .insert({ org_id, payload })
      .select('id, expires_at')
      .single();

    if (insertError || !token) {
      console.error('[generate-claim-token] Insert error:', insertError?.message);
      return new Response(
        JSON.stringify({ success: false, error: insertError?.message || 'Failed to create claim token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
    const claimUrl = `${baseUrl}/claim/${token.id}`;

    console.log('[generate-claim-token] Token created:', token.id);

    return new Response(
      JSON.stringify({
        success: true,
        token_id: token.id,
        claim_url: claimUrl,
        expires_at: token.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[generate-claim-token] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
