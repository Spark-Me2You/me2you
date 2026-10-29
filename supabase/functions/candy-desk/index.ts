/**
 * Candy Desk Edge Function
 *
 * The staff Google Sheet's only door into the database
 * (scripts/candy-desk-sheet/Code.gs). The sheet has no Supabase login, so it
 * proves itself with a shared secret header instead of a JWT; deploy with
 * --no-verify-jwt. The secret is tied to one organization (the kiosk's).
 *
 * Request: POST { action: 'list' }
 *          POST { action: 'redeem' | 'unredeem', voucher_id }
 * Header:  x-candy-desk-secret: <CANDY_DESK_SECRET>
 *
 * Response (200): list → { success: true, vouchers: [...] }
 *                 redeem/unredeem → { success: true, voucher: { voucher_id, status, redeemed_at } }
 * Errors: { success: false, error } with 4xx (don't retry) or 5xx (retry).
 *
 * Environment variables:
 *   CANDY_DESK_SECRET  — long random string, also saved in the sheet's script properties
 *   CANDY_DESK_ORG_ID  — the organization whose vouchers the sheet manages
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

type JsonResponse = Record<string, unknown>;

type RedeemResult =
  | { status: 'ok'; voucher: { voucher_id: string; status: string; redeemed_at: string | null } }
  | { status: 'error'; http: number; error: string };

function json(status: number, body: JsonResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Compares in constant time so the secret can't be guessed byte by byte. */
function secretsMatch(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    diff |= (a[i] ?? 0) ^ b[i];
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Method not allowed' });
  }

  try {
    const secret = Deno.env.get('CANDY_DESK_SECRET') ?? '';
    const orgId = Deno.env.get('CANDY_DESK_ORG_ID') ?? '';
    if (!secret || !orgId) {
      console.error('[candy-desk] CANDY_DESK_SECRET or CANDY_DESK_ORG_ID is not set');
      return json(500, { success: false, error: 'Candy desk is not configured' });
    }

    if (!secretsMatch(req.headers.get('x-candy-desk-secret') ?? '', secret)) {
      console.error('[candy-desk] Bad or missing secret');
      return json(401, { success: false, error: 'Unauthorized' });
    }

    let body: { action?: string; voucher_id?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { success: false, error: 'Invalid JSON body' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    if (body.action === 'list') {
      const { data, error } = await admin.rpc('candy_desk_vouchers', { p_org_id: orgId });
      if (error) {
        console.error('[candy-desk] list failed:', error.message);
        return json(500, { success: false, error: 'Could not load vouchers' });
      }
      return json(200, { success: true, vouchers: data ?? [] });
    }

    if (body.action === 'redeem' || body.action === 'unredeem') {
      if (!body.voucher_id) {
        return json(400, { success: false, error: 'voucher_id is required' });
      }

      const { data, error } = await admin.rpc('set_candy_voucher_redeemed', {
        p_voucher_id: body.voucher_id,
        p_org_id: orgId,
        p_redeemed: body.action === 'redeem',
      });
      if (error || !data) {
        console.error('[candy-desk]', body.action, 'failed:', error?.message, 'voucher:', body.voucher_id);
        return json(500, { success: false, error: 'Could not update voucher' });
      }

      const result = data as RedeemResult;
      if (result.status === 'error') {
        console.error('[candy-desk] Rejected:', result.error, 'voucher:', body.voucher_id);
        return json(result.http, { success: false, error: result.error });
      }

      console.log('[candy-desk]', body.action, 'voucher:', body.voucher_id, '→', result.voucher.status);
      return json(200, { success: true, voucher: result.voucher });
    }

    return json(400, { success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('[candy-desk] Error:', error);
    return json(500, { success: false, error: error.message || 'Internal server error' });
  }
});
