/**
 * Claim Candy Reward Edge Function
 *
 * Called by an authenticated mobile user to claim a Gumball Slice win
 * (claim token with payload.type === 'candy_reward').
 *
 * All the work happens in one database transaction inside
 * public.issue_candy_voucher() (025_candy_rewards.sql): token checks, a
 * server-side re-check of the win rule, claiming the token, saving the score,
 * the 1-per-day cap, and creating the voucher. This function only proves who
 * the caller is and turns the outcome into a ClaimPayload for the success page.
 *
 * Response (200): { success: true, token_id, payload } where payload.data.status
 * is 'issued' (with code + voucher_id), 'capped' or 'disabled'.
 * Errors: { success: false, error } with 4xx/5xx.
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

type IssueResult =
  | { status: 'issued'; voucher_id: string; code: string; won_on: string }
  | { status: 'capped'; resets_at: string }
  | { status: 'disabled' }
  | { status: 'error'; http: number; error: string };

function json(status: number, body: JsonResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** What the phone's claim success page shows for each outcome. */
function display(result: Exclude<IssueResult, { status: 'error' }>) {
  switch (result.status) {
    case 'issued':
      return {
        title: 'You won candy! 🍬',
        description: `Your candy code is ${result.code}. It's saved under "my candy" on your profile; show it at the Spark front desk to get a coin for the candy machine.`,
        icon: 'gift',
      };
    case 'capped':
      return {
        title: "You already won today's candy",
        description: 'One candy per day. Your score was saved, so come back tomorrow and win again!',
        icon: 'star',
      };
    case 'disabled':
      return {
        title: 'Candy is paused right now',
        description: 'Your score was saved. Check back soon!',
        icon: 'star',
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[claim-candy-reward] Function invoked');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { success: false, error: 'Missing authorization header' });
    }

    // User-authenticated client — used only to prove identity
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service role client — the only role allowed to call issue_candy_voucher
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[claim-candy-reward] Auth error:', authError?.message);
      return json(401, { success: false, error: 'Unauthorized' });
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

    // The function also checks the caller has a "user" row in the token's org,
    // which rejects kiosks and admins.
    const { data, error: rpcError } = await admin.rpc('issue_candy_voucher', {
      p_token_id: token_id,
      p_user_id: user.id,
    });

    if (rpcError || !data) {
      console.error('[claim-candy-reward] issue_candy_voucher failed:', rpcError?.message, 'token:', token_id);
      return json(500, { success: false, error: 'Could not claim candy reward' });
    }

    const result = data as IssueResult;
    if (result.status === 'error') {
      console.error('[claim-candy-reward] Rejected:', result.error, 'token:', token_id);
      return json(result.http, { success: false, error: result.error });
    }

    console.log('[claim-candy-reward]', result.status, 'for user:', user.id, 'token:', token_id);

    return json(200, {
      success: true,
      token_id,
      payload: {
        version: '1.0',
        type: 'candy_reward',
        display: display(result),
        data: result,
      },
    });
  } catch (error) {
    console.error('[claim-candy-reward] Error:', error);
    return json(500, { success: false, error: error.message || 'Internal server error' });
  }
});
