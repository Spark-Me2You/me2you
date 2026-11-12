import { describe, it, expect } from 'vitest';
import { diagnoseClaimFailure } from './claimGuard.ts';

const expected = { orgId: 'org-1', type: 'message', typeError: 'Token is not a message claim' };
const row = (over: Record<string, unknown> = {}) => ({
  org_id: 'org-1',
  payload: { type: 'message' },
  ...over,
});

describe('diagnoseClaimFailure', () => {
  it('404 when the token does not exist', () => {
    expect(diagnoseClaimFailure(null, expected).status).toBe(404);
  });
  it('403 for a different org', () => {
    expect(diagnoseClaimFailure(row({ org_id: 'org-2' }), expected).status).toBe(403);
  });
  it('400 for the wrong payload type', () => {
    const r = diagnoseClaimFailure(row({ payload: { type: 'drawing' } }), expected);
    expect(r).toEqual({ status: 400, error: 'Token is not a message claim' });
  });
  it('400 when payload is null', () => {
    expect(diagnoseClaimFailure(row({ payload: null }), expected).status).toBe(400);
  });
  it('409 when org and type are right (already claimed or expired)', () => {
    expect(diagnoseClaimFailure(row(), expected).status).toBe(409);
  });
});
