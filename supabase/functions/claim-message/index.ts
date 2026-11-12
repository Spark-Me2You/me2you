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
 *      AND org_id = caller's org AND payload.type = 'message'
 *      (aborts if already claimed, expired, wrong org or wrong type — so only a
 *      valid claim ever consumes the token)
 *   4. Defence in depth: re-validate org match + payload.type === 'message'
 *   5. Validate recipient exists in "user" with the same org_id
 *   6. INSERT messages row
 *   7. Return { success: true, token_id, message_id }
 *
 * Compensation: if a step after 3 fails, the token is reverted to 'pending'
 * (guarded by claimed_by = caller) so the user can retry. A failed revert is
 * logged with the token_id for manual reconciliation.
 *
 * Environment variables (auto-provided):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { diagnoseClaimFailure } from '../_shared/claimGuard.ts';

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
    // plus the org and payload-type filters is the entire lock — any concurrent
    // caller either wins this update or gets zero rows back, and a wrong-org or
    // wrong-type caller can never burn the token.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: updateError } = await admin
      .from('claim_tokens')
      .update({ status: 'claimed', claimed_by: user.id })
      .eq('id', token_id)
      .eq('status', 'pending')
      .eq('org_id', userRow.org_id)
      .eq('payload->>type', 'message')
      .gt('expires_at', nowIso)
      .select('id, org_id, payload')
      .maybeSingle();

    if (updateError || !claimed) {
      console.error('[claim-message] Claim failed:', updateError?.message);
      // Nothing was consumed. Read the row (service role) to give the caller
      // the specific reason.
      const { data: existing } = await admin
        .from('claim_tokens')
        .select('org_id, payload')
        .eq('id', token_id)
        .maybeSingle();
      const failure = diagnoseClaimFailure(existing, {
        orgId: userRow.org_id,
        type: 'message',
        typeError: 'Token is not a message claim',
      });
      return json(failure.status, { success: false, error: failure.error });
    }

    console.log('[claim-message] Token reserved:', token_id, 'by:', user.id);

    // Puts the token back to 'pending' after a failure past the lock so the
    // user can retry. Guarded so it only undoes our own claim.
    const revertClaim = async () => {
      const { error: revertError } = await admin
        .from('claim_tokens')
        .update({ status: 'pending', claimed_by: null })
        .eq('id', token_id)
        .eq('claimed_by', user.id)
        .eq('status', 'claimed');
      if (revertError) {
        console.error('[claim-message] Revert of claim failed — manual reconciliation needed. token:', token_id, revertError.message);
      }
    };

    // Step 4: defence in depth — the update filters already guarantee these.
    if (claimed.org_id !== userRow.org_id) {
      console.error('[claim-message] Org mismatch — token:', claimed.org_id, 'user:', userRow.org_id);
      await revertClaim();
      return json(403, { success: false, error: 'Token is not from your organization' });
    }

    const payload = claimed.payload as
      | { version?: string; type?: string; data?: { recipient_id?: string } }
      | null;

    if (!payload || payload.version !== '1.0' || payload.type !== 'message') {
      console.error('[claim-message] Wrong payload type/version:', payload?.type, payload?.version);
      await revertClaim();
      return json(400, { success: false, error: 'Token is not a message claim' });
    }

    const recipientId = payload.data?.recipient_id;
    if (!recipientId || typeof recipientId !== 'string') {
      console.error('[claim-message] Missing recipient_id in payload');
      await revertClaim();
      return json(400, { success: false, error: 'Token payload is missing recipient_id' });
    }

    // Step 5: verify recipient still exists in the same org.
    const { data: recipientRow } = await admin
      .from('user')
      .select('id')
      .eq('id', recipientId)
      .eq('org_id', claimed.org_id)
      .single();

    if (!recipientRow) {
      console.error('[claim-message] Recipient not found or wrong org:', recipientId, 'org:', claimed.org_id);
      await revertClaim();
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
      await revertClaim();
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
