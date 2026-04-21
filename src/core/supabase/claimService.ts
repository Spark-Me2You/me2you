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

  subscribeToClaim: (
    tokenId: string,
    onClaimed: (payload: ClaimPayload, claimedBy: string) => void
  ): (() => void) => {
    const channel = supabase
      .channel(`claim-token-${tokenId}`)
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
            onClaimed(row.payload, row.claimed_by);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
