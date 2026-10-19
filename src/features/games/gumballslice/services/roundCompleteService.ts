/**
 * Round Complete Service
 * The single hand-off point for a finished Gumball Slice round. The results
 * screen shows whatever this returns.
 */

import type { RoundResult } from "../types/gumballSlice";

export function onRoundComplete(result: RoundResult): RoundResult {
  // TODO(rewards): create the reward token + claim QR, enforce daily/weekly
  // caps and sync to the Google Sheet here; keep returning the result.
  console.info("[GumballSlice] round complete", result);
  return result;
}
