/**
 * Claim Message Edge Function
 *
 * Called by an authenticated mobile user to claim a message-type token and
 * deliver their message to the recipient's inbox.
 *
 * ORDER (must not change — the DB lock has to come BEFORE any writes):
 *   1. Auth user, resolve their org_id from the "user" table
 *   2. Parse + validate request body: token_id, body (1–500 chars trimmed)
 *   3. Atomic UPDATE claim_tokens SET status='claimed' WHERE status='pending'
 *      (aborts if already claimed or expired — prevents double-claim)
 *   4. Validate org match + payload.type === 'message'
 *   5. Validate recipient exists in "user" with the same org_id
 *   6. INSERT messages row
 *   7. Return { success: true, token_id, message_id }
 *
 * Compensation: once step 3 succeeds the token is permanently claimed. If a
 * later step fails we return an error and log the token_id for manual
 * reconciliation rather than revert the claim — reverting would reopen a
 * double-claim race.
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

type JsonResponse = Record<string, unknown>;

function json(status: number, body: JsonResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const BODY_MAX = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[claim-message] Function invoked');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { success: false, error: 'Missing authorization header' });
    }

    // User-authenticated client — used only to prove identity + read user org_id
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service role client — bypasses RLS for token update + messages insert
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Step 1a: authenticate the caller
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[claim-message] Auth error:', authError?.message);
      return json(401, { success: false, error: 'Unauthorized' });
    }

    // Step 1b: resolve the caller's org from the "user" table.
    // Kiosks and admins have no row here — that rejects them.
    const { data: userRow } = await userClient
      .from('user')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userRow?.org_id) {
      console.error('[claim-message] No user row for:', user.id);
      return json(403, { success: false, error: 'User not found or has no organization' });
    }

    // Step 2: parse + validate request body
    let reqBody: { token_id?: string; body?: string };
    try {
      reqBody = await req.json();
    } catch {
      return json(400, { success: false, error: 'Invalid JSON body' });
    }

    const { token_id } = reqBody;
    if (!token_id) {
      return json(400, { success: false, error: 'token_id is required' });
    }

    const rawBody = reqBody.body;
    if (typeof rawBody !== 'string') {
      return json(400, { success: false, error: 'body is required' });
    }
    const trimmedBody = rawBody.trim();
    if (trimmedBody.length < 1 || trimmedBody.length > BODY_MAX) {
      return json(400, { success: false, error: `body must be between 1 and ${BODY_MAX} characters` });
    }

    // Step 3: ATOMIC reservation. `WHERE status='pending' AND expires_at > now()`
    // is the entire lock — any concurrent caller either wins this update or gets
    // zero rows back. We do this BEFORE reading any fields so there is no window
    // where two callers can both pass validation and race on the insert.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: updateError } = await admin
      .from('claim_tokens')
      .update({ status: 'claimed', claimed_by: user.id })
      .eq('id', token_id)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .select('id, org_id, payload')
      .single();

    if (updateError || !claimed) {
      console.error('[claim-message] Claim failed (already claimed / expired / not found):', updateError?.message);
      return json(409, { success: false, error: 'Token is not claimable — already claimed, expired, or not found' });
    }

    console.log('[claim-message] Token reserved:', token_id, 'by:', user.id);

    // Step 4: validate the reserved token matches the user's org + is a message.
    // Any failure here still leaves the token claimed — that's intentional, the
    // token is now spent and cannot be reused. A malformed token is a
    // kiosk-side bug, not a user error.
    if (claimed.org_id !== userRow.org_id) {
      console.error('[claim-message] Org mismatch — token:', claimed.org_id, 'user:', userRow.org_id);
      return json(403, { success: false, error: 'Token is not from your organization' });
    }

    const payload = claimed.payload as
      | { version?: string; type?: string; data?: { recipient_id?: string } }
      | null;

    if (!payload || payload.version !== '1.0' || payload.type !== 'message') {
      console.error('[claim-message] Wrong payload type/version:', payload?.type, payload?.version);
      return json(400, { success: false, error: 'Token is not a message claim' });
    }

    const recipientId = payload.data?.recipient_id;
    if (!recipientId || typeof recipientId !== 'string') {
      console.error('[claim-message] Missing recipient_id in payload');
      return json(400, { success: false, error: 'Token payload is missing recipient_id' });
    }

    // Step 5: verify recipient still exists in the same org.
    // If they were deleted after the QR was generated the token stays spent —
    // consistent with the claim-drawing policy of no revert after lock.
    const { data: recipientRow } = await admin
      .from('user')
      .select('id')
      .eq('id', recipientId)
      .eq('org_id', claimed.org_id)
      .single();

    if (!recipientRow) {
      console.error('[claim-message] Recipient not found or wrong org:', recipientId, 'org:', claimed.org_id);
      return json(404, { success: false, error: 'Recipient not found' });
    }

    // Step 6: insert the message row
    const { data: messageRow, error: insertError } = await admin
      .from('messages')
      .insert({
        from_user_id: user.id,
        to_user_id: recipientId,
        org_id: claimed.org_id,
        body: trimmedBody,
      })
      .select('id')
      .single();

    if (insertError || !messageRow) {
      console.error('[claim-message] messages insert failed:', insertError?.message, 'token:', token_id);
      return json(500, { success: false, error: 'Failed to deliver message (contact support with token id)' });
    }

    console.log('[claim-message] Message delivered:', messageRow.id, 'from:', user.id, 'to:', recipientId);

    return json(200, {
      success: true,
      token_id,
      message_id: messageRow.id,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[claim-message] Error:', message);
    return json(500, { success: false, error: message });
  }
});
