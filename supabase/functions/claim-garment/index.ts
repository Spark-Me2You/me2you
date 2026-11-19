/**
 * Claim Garment Edge Function
 *
 * Called by an authenticated mobile user to claim a garment-type token shown
 * on the kiosk after the clothesline photo booth. Marks the token as claimed,
 * then makes the user the owner of the garments it names so they can wear
 * them on their mii. Needs migration 034.
 *
 * ORDER (the token lock comes first, as in claim-drawing):
 *   1. Auth user, resolve their org_id from the "user" table
 *   2. Atomic UPDATE claim_tokens SET status='claimed' WHERE status='pending'
 *   3. Validate org match + payload.type === 'garment' + payload.data.garment_ids
 *   4. UPDATE garments SET owner_id = user, expires_at = null
 *      WHERE id IN (ids) AND org_id = user's org AND owner_id IS NULL
 *
 * Step 4 only ever touches unowned garments in the caller's org, so a forged
 * or replayed payload can't take clothes that belong to someone else.
 *
 * Environment variables (auto-provided):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** One photo yields a top and a bottom at most; leave a little headroom. */
const MAX_GARMENTS_PER_TOKEN = 4;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JsonResponse = Record<string, unknown>;

function json(status: number, body: JsonResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { success: false, error: 'Missing authorization header' });
    }

    // User-authenticated client — proves identity and reads the user's org_id
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service role client — bypasses RLS for the token and garment updates
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Step 1a: authenticate the caller
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[claim-garment] Auth error:', authError?.message);
      return json(401, { success: false, error: 'Unauthorized' });
    }

    // Step 1b: kiosks and admins have no "user" row, which rejects them.
    const { data: userRow } = await userClient
      .from('user')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userRow?.org_id) {
      console.error('[claim-garment] No user row for:', user.id);
      return json(403, { success: false, error: 'User not found or has no organization' });
    }

    let body: { token_id?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { success: false, error: 'Invalid JSON body' });
    }

    const { token_id } = body;
    if (!token_id) {
      return json(400, { success: false, error: 'token_id is required' });
    }

    // Step 2: atomic reservation — the WHERE clause is the whole lock.
    const { data: claimed, error: updateError } = await admin
      .from('claim_tokens')
      .update({ status: 'claimed', claimed_by: user.id })
      .eq('id', token_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .select('id, org_id, payload')
      .single();

    if (updateError || !claimed) {
      console.error('[claim-garment] Claim failed (already claimed / expired / not found):', updateError?.message);
      return json(409, { success: false, error: 'Token is not claimable — already claimed, expired, or not found' });
    }

    // Step 3: validate. A failure here leaves the token spent, as in claim-drawing.
    if (claimed.org_id !== userRow.org_id) {
      console.error('[claim-garment] Org mismatch — token:', claimed.org_id, 'user:', userRow.org_id);
      return json(403, { success: false, error: 'Token is not from your organization' });
    }

    const payload = claimed.payload as
      | { type?: string; data?: { garment_ids?: unknown } }
      | null;

    if (!payload || payload.type !== 'garment') {
      console.error('[claim-garment] Wrong payload type:', payload?.type);
      return json(400, { success: false, error: 'Token is not a garment claim' });
    }

    const rawIds = payload.data?.garment_ids;
    const garmentIds = Array.isArray(rawIds)
      ? rawIds.filter((id): id is string => typeof id === 'string' && UUID.test(id))
      : [];

    if (garmentIds.length === 0 || garmentIds.length > MAX_GARMENTS_PER_TOKEN) {
      console.error('[claim-garment] Bad garment_ids in payload, token:', token_id);
      return json(400, { success: false, error: 'Token payload has no valid garments' });
    }

    // Step 4: take ownership of garments nobody owns yet, in this org only.
    const { data: garments, error: garmentError } = await admin
      .from('garments')
      .update({ owner_id: user.id, expires_at: null })
      .in('id', garmentIds)
      .eq('org_id', userRow.org_id)
      .is('owner_id', null)
      .select('id');

    if (garmentError) {
      console.error('[claim-garment] garments update failed:', garmentError.message, 'token:', token_id);
      return json(500, { success: false, error: 'Failed to claim your clothes (contact support with token id)' });
    }

    if (!garments || garments.length === 0) {
      console.error('[claim-garment] No claimable garments, token:', token_id);
      return json(409, { success: false, error: 'These clothes are no longer on the line' });
    }

    console.log('[claim-garment] Claimed', garments.length, 'garment(s) for user:', user.id);

    return json(200, {
      success: true,
      token_id,
      garment_ids: garments.map((garment) => garment.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[claim-garment] Error:', message);
    return json(500, { success: false, error: message });
  }
});
