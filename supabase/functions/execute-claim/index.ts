/**
 * Execute Claim Edge Function
 *
 * Called by an authenticated mobile user to claim a token.
 * Atomically marks the token as claimed and returns the payload.
 * Features react to the claim via Supabase Realtime on the kiosk side.
 *
 * SECURITY:
 * - Caller must be an authenticated user with a row in the "user" table
 * - org_id must match between user and token
 * - Atomic UPDATE WHERE status='pending' prevents double-claims
 * - All token mutations use the service role client (no direct user UPDATE)
 *
 * Environment variables:
 * - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-provided)
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
    console.log('[execute-claim] Function invoked');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User-authenticated client — used only to prove identity and read user org_id
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client — used for all token reads/writes (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[execute-claim] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's org_id — kiosks and admins have no row here, which rejects them
    const { data: userRow } = await userClient
      .from('user')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userRow?.org_id) {
      console.error('[execute-claim] No user row found for:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found or has no organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: { token_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token_id } = body;
    if (!token_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'token_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[execute-claim] Fetching token:', token_id);

    const { data: token } = await adminClient
      .from('claim_tokens')
      .select('*')
      .eq('id', token_id)
      .single();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (token.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'Token has already been claimed or expired' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(token.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (token.org_id !== userRow.org_id) {
      console.error('[execute-claim] Org mismatch — token:', token.org_id, 'user:', userRow.org_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Token is not from your organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atomic claim — WHERE status='pending' prevents double-claims under race conditions
    const { data: updated, error: updateError } = await adminClient
      .from('claim_tokens')
      .update({ status: 'claimed', claimed_by: user.id })
      .eq('id', token_id)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !updated) {
      console.error('[execute-claim] Claim failed (race or already claimed):', updateError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Claim failed — token may have already been claimed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[execute-claim] Token claimed by:', user.id);

    return new Response(
      JSON.stringify({ success: true, token_id: updated.id, payload: updated.payload }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[execute-claim] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
