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
  generateClaimToken: async (payload: ClaimPayload): Promise<GeneratedClaim> => {
    const { data, error } = await supabase.functions.invoke<GenerateClaimResponse>(
      'generate-claim-token',
      { body: { payload } }
    );

    if (error) {
      console.error('[claimService] generate-claim-token error:', error);
      throw new Error(error.message || 'Failed to generate claim token');
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
      throw new Error(error.message || 'Failed to execute claim');
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

  executeDrawingClaim: async (tokenId: string): Promise<DrawingClaimResult> => {
    const { data, error } = await supabase.functions.invoke<ClaimDrawingResponse>(
      'claim-drawing',
      { body: { token_id: tokenId } }
    );

    if (error) {
      console.error('[claimService] claim-drawing error:', error);
      throw new Error(error.message || 'Failed to claim drawing');
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
      throw new Error(error.message || 'Failed to send message');
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
