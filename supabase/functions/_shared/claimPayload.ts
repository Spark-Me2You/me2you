/**
 * Plausibility validation for kiosk-generated claim payloads.
 *
 * NOTE: this is plausibility checking only. A kiosk session can still assert
 * any in-range result (score, sliced count, ...) — client-asserted results
 * remain forgeable until rounds are recorded server-side.
 *
 * Pure: no Deno globals or remote imports, so it is unit-tested with Vitest.
 *
 * Field shapes are taken from the client builders:
 *   game_score   GameOverClaim.tsx            (game_id, score, played_at)
 *   candy_reward roundCompleteService.ts      (round_id, sliced_count, ...)
 *   drawing      drawit/ReviewScreen.tsx      (image_path, prompt)
 *   message      messages/SendMessageButton   (recipient_id, recipient_name)
 * and from migrations 016 (game_score trigger) and 025 (issue_candy_voucher).
 */

export const CLAIM_PAYLOAD_TYPES = ['game_score', 'candy_reward', 'drawing', 'message'] as const;

export const MAX_GAME_SCORE = 100000;
export const MIN_ROUND_DURATION_MS = 5000;

type Data = Record<string, unknown>;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNonNegInt = (v: unknown): v is number => isInt(v) && v >= 0;

/** Returns an error message, or null when the payload is plausible. */
export function validateClaimPayload(payload: { type: string; data: Data }): string | null {
  const { type, data } = payload;

  switch (type) {
    case 'game_score': {
      if (!isInt(data.score) || data.score < 0 || data.score > MAX_GAME_SCORE) {
        return `game_score data.score must be an integer between 0 and ${MAX_GAME_SCORE}`;
      }
      if (!isNonEmptyString(data.game_id)) {
        return 'game_score data.game_id must be a non-empty string';
      }
      return null;
    }

    case 'candy_reward': {
      if (!isNonNegInt(data.sliced_count)) {
        return 'candy_reward data.sliced_count must be a non-negative integer';
      }
      if (!isNonNegInt(data.broccoli_hits)) {
        return 'candy_reward data.broccoli_hits must be a non-negative integer';
      }
      if (typeof data.full_round !== 'boolean') {
        return 'candy_reward data.full_round must be a boolean';
      }
      // round_id is TEXT in migration 025, so only require a non-empty string.
      if (!isNonEmptyString(data.round_id)) {
        return 'candy_reward data.round_id must be a non-empty string';
      }
      if (
        data.duration_ms !== undefined &&
        (typeof data.duration_ms !== 'number' ||
          !Number.isFinite(data.duration_ms) ||
          data.duration_ms < MIN_ROUND_DURATION_MS)
      ) {
        return `candy_reward data.duration_ms must be a number of at least ${MIN_ROUND_DURATION_MS}`;
      }
      return null;
    }

    case 'drawing': {
      if (!isNonEmptyString(data.image_path)) {
        return 'drawing data.image_path must be a non-empty string';
      }
      if (data.prompt !== undefined && typeof data.prompt !== 'string') {
        return 'drawing data.prompt must be a string';
      }
      return null;
    }

    case 'message': {
      if (!isNonEmptyString(data.recipient_id)) {
        return 'message data.recipient_id must be a non-empty string';
      }
      if (data.recipient_name !== undefined && typeof data.recipient_name !== 'string') {
        return 'message data.recipient_name must be a string';
      }
      return null;
    }

    default:
      return `Unsupported payload type "${type}"`;
  }
}
