/**
 * Claim Drawing Edge Function
 *
 * Called by an authenticated mobile user to claim a drawing-type token.
 * Atomically marks the token as claimed, moves the PNG from the temp-drawings
 * bucket into the permanent drawings bucket under the user's folder, and
 * records the drawing in the drawings table.
 *
 * ORDER (must not change — the DB lock has to come BEFORE any storage work):
 *   1. Auth user, resolve their org_id from the "user" table
 *   2. Atomic UPDATE claim_tokens SET status='claimed' WHERE status='pending'
 *      AND org_id = caller's org AND payload.type = 'drawing'
 *      (aborts if already claimed, expired, wrong org or wrong type — so only
 *      a valid claim ever consumes the token)
 *   3. Defence in depth: re-validate org match + payload.type === 'drawing'
 *   4. Extract image_path + prompt from payload.data
 *   5. Generate new drawing_id and new_path = `${user.id}/${drawing_id}.png`
 *   6. Download from temp-drawings, upload to drawings
 *   7. Insert drawings row
 *   8. Best-effort remove from temp-drawings (logged, non-fatal)
 *
 * Compensation: if a step after 2 fails, the token is reverted to 'pending'
 * (guarded by claimed_by = caller) so the user can retry. A failed revert is
 * logged with the token_id for manual reconciliation. A permanent file already
 * uploaded is removed before the revert.
 *
 * Environment variables (auto-provided):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { diagnoseClaimFailure } from '../_shared/claimGuard.ts';
import { isSafeTempDrawingPath } from '../_shared/drawingPath.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMP_BUCKET = 'temp-drawings';
const PERM_BUCKET = 'drawings';

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
    console.log('[claim-drawing] Function invoked');

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

    // Service role client — bypasses RLS for token update + storage + drawings insert
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Step 1a: authenticate the caller
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[claim-drawing] Auth error:', authError?.message);
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
      console.error('[claim-drawing] No user row for:', user.id);
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

    // Step 2: ATOMIC reservation. `WHERE status='pending' AND expires_at > now()`
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
      .eq('payload->>type', 'drawing')
      .gt('expires_at', nowIso)
      .select('id, org_id, payload')
      .maybeSingle();

    if (updateError || !claimed) {
      console.error('[claim-drawing] Claim failed:', updateError?.message);
      // Nothing was consumed. Read the row (service role) to give the caller
      // the specific reason.
      const { data: existing } = await admin
        .from('claim_tokens')
        .select('org_id, payload')
        .eq('id', token_id)
        .maybeSingle();
      const failure = diagnoseClaimFailure(existing, {
        orgId: userRow.org_id,
        type: 'drawing',
        typeError: 'Token is not a drawing claim',
      });
      return json(failure.status, { success: false, error: failure.error });
    }

    console.log('[claim-drawing] Token reserved:', token_id, 'by:', user.id);

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
        console.error('[claim-drawing] Revert of claim failed — manual reconciliation needed. token:', token_id, revertError.message);
      }
    };

    // Step 3: defence in depth — the update filters already guarantee these.
    if (claimed.org_id !== userRow.org_id) {
      console.error('[claim-drawing] Org mismatch — token:', claimed.org_id, 'user:', userRow.org_id);
      await revertClaim();
      return json(403, { success: false, error: 'Token is not from your organization' });
    }

    const payload = claimed.payload as
      | { type?: string; data?: { image_path?: string; prompt?: string } }
      | null;

    if (!payload || payload.type !== 'drawing') {
      console.error('[claim-drawing] Wrong payload type:', payload?.type);
      await revertClaim();
      return json(400, { success: false, error: 'Token is not a drawing claim' });
    }

    const tempPath = payload.data?.image_path;
    const prompt = payload.data?.prompt ?? null;

    if (!tempPath || typeof tempPath !== 'string') {
      console.error('[claim-drawing] Missing image_path in payload');
      await revertClaim();
      return json(400, { success: false, error: 'Token payload is missing image_path' });
    }

    // image_path is kiosk-supplied and downloaded with the service role, so it
    // must stay inside the token's own org folder in temp-drawings.
    if (!isSafeTempDrawingPath(tempPath, claimed.org_id)) {
      console.error('[claim-drawing] Rejected image_path outside org folder:', tempPath, 'token:', token_id);
      await revertClaim();
      return json(400, { success: false, error: 'Token payload has an invalid image_path' });
    }

    // Step 5: generate the permanent path under the user's folder
    const drawingId = crypto.randomUUID();
    const newPath = `${user.id}/${drawingId}.png`;

    // Step 6: move the file. Download from temp, upload to permanent.
    const { data: blob, error: downloadError } = await admin.storage
      .from(TEMP_BUCKET)
      .download(tempPath);

    if (downloadError || !blob) {
      console.error('[claim-drawing] Download from temp-drawings failed:', downloadError?.message, 'path:', tempPath, 'token:', token_id);
      await revertClaim();
      return json(500, { success: false, error: 'Failed to read temp drawing (contact support with token id)' });
    }

    const { error: uploadError } = await admin.storage
      .from(PERM_BUCKET)
      .upload(newPath, blob, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('[claim-drawing] Upload to drawings failed:', uploadError.message, 'path:', newPath, 'token:', token_id);
      await revertClaim();
      return json(500, { success: false, error: 'Failed to save drawing (contact support with token id)' });
    }

    // Step 7: record the drawing. If this fails the file is already in the
    // permanent bucket — we remove it to keep storage consistent with the DB.
    const { error: insertError } = await admin.from('drawings').insert({
      id: drawingId,
      owner_id: user.id,
      org_id: userRow.org_id,
      image_path: newPath,
      prompt,
    });

    if (insertError) {
      console.error('[claim-drawing] drawings insert failed:', insertError.message, 'token:', token_id);
      const { error: rollbackError } = await admin.storage.from(PERM_BUCKET).remove([newPath]);
      if (rollbackError) {
        console.error('[claim-drawing] Rollback of permanent upload failed:', rollbackError.message, 'path:', newPath);
      }
      await revertClaim();
      return json(500, { success: false, error: 'Failed to record drawing (contact support with token id)' });
    }

    // Step 8: best-effort cleanup. Orphaned temp files are garbage that can be
    // swept later; failing the whole request for this would be worse.
    const { error: removeError } = await admin.storage.from(TEMP_BUCKET).remove([tempPath]);
    if (removeError) {
      console.error('[claim-drawing] Temp cleanup failed (non-fatal):', removeError.message, 'path:', tempPath);
    }

    console.log('[claim-drawing] Drawing claimed:', drawingId, 'for user:', user.id);

    return json(200, {
      success: true,
      token_id,
      drawing_id: drawingId,
      image_path: newPath,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[claim-drawing] Error:', message);
    return json(500, { success: false, error: message });
  }
});
