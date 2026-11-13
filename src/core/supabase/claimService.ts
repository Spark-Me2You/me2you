import { supabase } from './client';
import type { ClaimPayload, GeneratedClaim, ClaimResult } from '@/features/claim/types';

interface GenerateClaimResponse {
  success: boolean;
  token_id?: string;
  claim_url?: string;
  expires_at?: string;
  error?: string;
}

interface ExecuteClaimResponse {
  success: boolean;
  token_id?: string;
  payload?: ClaimPayload;
  error?: string;
}

/**
 * functions.invoke reports any 4xx/5xx as a generic "non-2xx status code"
 * error; the function's own `{ error }` message is in the response body.
 */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const response = (error as { context?: unknown })?.context;
  if (response instanceof Response) {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Not JSON; fall through.
    }
  }
  const message = (error as { message?: unknown })?.message;
  return typeof message === 'string' && message ? message : fallback;
}

export type ClaimPeekPayload = { type?: string; data?: { recipient_name?: string } };

interface ClaimDrawingResponse {
  success: boolean;
  token_id?: string;
  drawing_id?: string;
  image_path?: string;
  error?: string;
}

interface ClaimMessageResponse {
  success: boolean;
  token_id?: string;
  message_id?: string;
  error?: string;
}

export interface MessageClaimResult {
  success: true;
  token_id: string;
  message_id: string;
}

export interface DrawingClaimResult {
  success: true;
  token_id: string;
  drawing_id: string;
  image_path: string;
}

export const claimService = {
  /**
   * Read a pending token's payload without claiming it. Uses the peek_claim_token RPC;
   * until that migration is deployed it falls back to selecting the row directly.
   */
  peekClaimToken: async (tokenId: string): Promise<ClaimPeekPayload | null> => {
    // peek_claim_token is not in the generated types yet: remove this cast after `npm run gen:types`.
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: { p_token_id: string }
    ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
    const { data, error } = await rpc.call(supabase, 'peek_claim_token', { p_token_id: tokenId });

    if (!error) return (data as ClaimPeekPayload | null) ?? null;

    const missing =
      error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? '');
    if (!missing) {
      // Let execute-claim report the real problem.
      console.warn('[claimService] peek_claim_token failed:', error);
      return null;
    }

    const { data: row } = await supabase
      .from('claim_tokens')
      .select('payload')
      .eq('id', tokenId)
      .single();
    return (row?.payload as ClaimPeekPayload | null) ?? null;
  },

  generateClaimToken: async (payload: ClaimPayload): Promise<GeneratedClaim> => {
    const { data, error } = await supabase.functions.invoke<GenerateClaimResponse>(
      'generate-claim-token',
      { body: { payload } }
    );

    if (error) {
      console.error('[claimService] generate-claim-token error:', error);
      throw new Error(await functionErrorMessage(error, 'Failed to generate claim token'));
    }

    if (!data?.success || !data.token_id || !data.claim_url || !data.expires_at) {
      console.error('[claimService] generate-claim-token returned error:', data?.error);
      throw new Error(data?.error || 'Failed to generate claim token');
    }

    return {
      token_id: data.token_id,
      claim_url: data.claim_url,
      expires_at: data.expires_at,
    };
  },

  executeClaim: async (tokenId: string): Promise<ClaimResult> => {
    const { data, error } = await supabase.functions.invoke<ExecuteClaimResponse>(
      'execute-claim',
      { body: { token_id: tokenId } }
    );

    if (error) {
      console.error('[claimService] execute-claim error:', error);
      throw new Error(await functionErrorMessage(error, 'Failed to execute claim'));
    }

    if (!data?.success || !data.token_id || !data.payload) {
      console.error('[claimService] execute-claim returned error:', data?.error);
      throw new Error(data?.error || 'Failed to execute claim');
    }

    return {
      success: true,
      token_id: data.token_id,
      payload: data.payload,
    };
  },

  // Same result shape as executeClaim: the edge function returns a payload
  // whose display describes the outcome (voucher issued, daily cap, paused).
  executeCandyClaim: async (tokenId: string): Promise<ClaimResult> => {
    const { data, error } = await supabase.functions.invoke<ExecuteClaimResponse>(
      'claim-candy-reward',
      { body: { token_id: tokenId } }
    );

    if (error) {
      console.error('[claimService] claim-candy-reward error:', error);
      throw new Error(await functionErrorMessage(error, 'Failed to claim candy'));
    }

    if (!data?.success || !data.token_id || !data.payload) {
      console.error('[claimService] claim-candy-reward returned error:', data?.error);
      throw new Error(data?.error || 'Failed to claim candy');
    }

    return {
      success: true,
      token_id: data.token_id,
      payload: data.payload,
    };
  },

  executeDrawingClaim: async (tokenId: string): Promise<DrawingClaimResult> => {
    const { data, error } = await supabase.functions.invoke<ClaimDrawingResponse>(
      'claim-drawing',
      { body: { token_id: tokenId } }
    );

    if (error) {
      console.error('[claimService] claim-drawing error:', error);
      throw new Error(await functionErrorMessage(error, 'Failed to claim drawing'));
    }

    if (!data?.success || !data.token_id || !data.drawing_id || !data.image_path) {
      console.error('[claimService] claim-drawing returned error:', data?.error);
      throw new Error(data?.error || 'Failed to claim drawing');
    }

    return {
      success: true,
      token_id: data.token_id,
      drawing_id: data.drawing_id,
      image_path: data.image_path,
    };
  },

  executeMessageClaim: async (tokenId: string, body: string): Promise<MessageClaimResult> => {
    const { data, error } = await supabase.functions.invoke<ClaimMessageResponse>(
      'claim-message',
      { body: { token_id: tokenId, body } }
    );

    if (error) {
      console.error('[claimService] claim-message error:', error);
      throw new Error(await functionErrorMessage(error, 'Failed to send message'));
    }

    if (!data?.success || !data.token_id || !data.message_id) {
      console.error('[claimService] claim-message returned error:', data?.error);
      throw new Error(data?.error || 'Failed to send message');
    }

    return {
      success: true,
      token_id: data.token_id,
      message_id: data.message_id,
    };
  },

  subscribeToClaim: (
    tokenId: string,
    onClaimed: (payload: ClaimPayload, claimedBy: string) => void
  ): (() => void) => {
    const channelName = `claim-token-${tokenId}`;
    let removed = false;

    const remove = () => {
      if (removed) return;
      removed = true;
      supabase.removeChannel(channel);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'claim_tokens',
          filter: `id=eq.${tokenId}`,
        },
        (event) => {
          const row = event.new as { status: string; payload: ClaimPayload; claimed_by: string };
          if (row.status === 'claimed') {
            remove();
            onClaimed(row.payload, row.claimed_by);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`[realtime] ${channelName} error:`, err);
        } else {
          console.log(`[realtime] ${channelName} ${status}`);
        }
      });

    return remove;
  },
};
