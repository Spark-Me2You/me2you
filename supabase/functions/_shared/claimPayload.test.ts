import { describe, it, expect } from 'vitest';
import { validateClaimPayload } from './claimPayload.ts';

const uuid = '123e4567-e89b-12d3-a456-426614174000';
const candy = (over: Record<string, unknown> = {}) => ({
  type: 'candy_reward',
  data: { round_id: uuid, sliced_count: 10, broccoli_hits: 0, full_round: true, duration_ms: 60000, ...over },
});

describe('validateClaimPayload', () => {
  it('rejects unknown types', () => {
    expect(validateClaimPayload({ type: 'high_score', data: {} })).toMatch(/Unsupported/);
  });

  describe('game_score', () => {
    const gs = (data: Record<string, unknown>) => validateClaimPayload({ type: 'game_score', data });
    it('accepts a normal score', () => {
      expect(gs({ game_id: 'flapflap', score: 12 })).toBeNull();
      expect(gs({ game_id: 'flapflap', score: 0 })).toBeNull();
      expect(gs({ game_id: 'flapflap', score: 100000 })).toBeNull();
    });
    it('rejects out-of-range, fractional and non-numeric scores', () => {
      expect(gs({ game_id: 'g', score: -1 })).not.toBeNull();
      expect(gs({ game_id: 'g', score: 100001 })).not.toBeNull();
      expect(gs({ game_id: 'g', score: 1.5 })).not.toBeNull();
      expect(gs({ game_id: 'g', score: '5' })).not.toBeNull();
      expect(gs({ game_id: 'g' })).not.toBeNull();
    });
    it('requires a game_id', () => {
      expect(gs({ score: 1 })).not.toBeNull();
      expect(gs({ game_id: '', score: 1 })).not.toBeNull();
    });
  });

  describe('candy_reward', () => {
    it('accepts a valid round', () => {
      expect(validateClaimPayload(candy())).toBeNull();
    });
    it('accepts a round without duration_ms', () => {
      expect(validateClaimPayload(candy({ duration_ms: undefined }))).toBeNull();
    });
    it('rejects bad counts, flags, ids and short durations', () => {
      expect(validateClaimPayload(candy({ sliced_count: -1 }))).not.toBeNull();
      expect(validateClaimPayload(candy({ sliced_count: 1.2 }))).not.toBeNull();
      expect(validateClaimPayload(candy({ broccoli_hits: '0' }))).not.toBeNull();
      expect(validateClaimPayload(candy({ full_round: 'yes' }))).not.toBeNull();
      expect(validateClaimPayload(candy({ round_id: 'abc' }))).not.toBeNull();
      expect(validateClaimPayload(candy({ duration_ms: 4999 }))).not.toBeNull();
      expect(validateClaimPayload(candy({ duration_ms: 'long' }))).not.toBeNull();
    });
  });

  describe('drawing', () => {
    const d = (data: Record<string, unknown>) => validateClaimPayload({ type: 'drawing', data });
    it('requires image_path string', () => {
      expect(d({ image_path: 'org/a.png', prompt: 'cat' })).toBeNull();
      expect(d({ image_path: 'org/a.png' })).toBeNull();
      expect(d({})).not.toBeNull();
      expect(d({ image_path: 3 })).not.toBeNull();
      expect(d({ image_path: 'a', prompt: 3 })).not.toBeNull();
    });
  });

  describe('message', () => {
    const m = (data: Record<string, unknown>) => validateClaimPayload({ type: 'message', data });
    it('requires recipient_id', () => {
      expect(m({ recipient_id: uuid, recipient_name: 'Sam' })).toBeNull();
      expect(m({ recipient_id: uuid })).toBeNull();
      expect(m({})).not.toBeNull();
      expect(m({ recipient_id: 5 })).not.toBeNull();
      expect(m({ recipient_id: uuid, recipient_name: 5 })).not.toBeNull();
    });
  });
});
