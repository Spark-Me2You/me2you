/**
 * Candy Voucher Service
 * Phone-side reads of the signed-in player's candy vouchers (candy_voucher,
 * 025_candy_rewards.sql). RLS only returns the caller's own rows; vouchers are
 * created by claim-candy-reward and redeemed at the front desk.
 */

import { supabase } from "@/core/supabase/client";

export type CandyVoucherStatus = "issued" | "redeemed" | "void";

export interface CandyVoucher {
  id: string;
  code: string;
  status: CandyVoucherStatus;
  wonOn: string; // YYYY-MM-DD, local day of the win
  issuedAt: string;
  redeemedAt: string | null;
}

interface RawCandyVoucherRow {
  id: string;
  code: string;
  status: CandyVoucherStatus;
  won_on: string;
  issued_at: string;
  redeemed_at: string | null;
}

export const candyVoucherService = {
  /** The player's vouchers, newest first. */
  listMine: async (): Promise<CandyVoucher[]> => {
    const { data, error } = await supabase
      .from("candy_voucher")
      .select("id, code, status, won_on, issued_at, redeemed_at")
      .order("issued_at", { ascending: false });

    if (error) {
      console.error("[candyVoucherService] list error:", error);
      throw new Error(error.message || "Failed to load candy");
    }

    return (data as RawCandyVoucherRow[]).map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      wonOn: row.won_on,
      issuedAt: row.issued_at,
      redeemedAt: row.redeemed_at,
    }));
  },

  /** Calls `onChange` whenever one of the player's vouchers is added or changes. */
  subscribeToMine: (userId: string, onChange: () => void): (() => void) => {
    const channel = supabase
      .channel(`candy-vouchers-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candy_voucher", filter: `owner_id=eq.${userId}` },
        onChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
