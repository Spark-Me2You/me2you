import { supabase } from '@/core/supabase/client';
import { claimService } from '@/core/supabase/claimService';
import type { MessageWithSender } from '../types';

export const messagesService = {
  listInbox: async (userId: string): Promise<MessageWithSender[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, from_user_id, to_user_id, org_id, body, created_at, sender:user!from_user_id (id, name)')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // supabase-js may return the embedded relation as an object or single-element array
    // depending on how it resolves the composite FK — normalize either shape.
    return (data ?? []).map((row) => ({
      ...row,
      sender: Array.isArray(row.sender) ? (row.sender[0] ?? null) : (row.sender ?? null),
    })) as MessageWithSender[];
  },

  sendMessage: (tokenId: string, body: string) =>
    claimService.executeMessageClaim(tokenId, body),

  deleteMessage: async (messageId: string): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    if (error) throw new Error(error.message);
  },
};
