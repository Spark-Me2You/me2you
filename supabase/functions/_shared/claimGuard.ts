/**
 * Pure helper for the claim-* edge functions. No Deno globals or remote
 * imports so it can be unit-tested with Vitest.
 */

export interface ClaimTokenRow {
  org_id: string;
  payload: { type?: string } | null;
}

export interface ClaimFailure {
  status: number;
  error: string;
}

const NOT_CLAIMABLE = 'Token is not claimable — already claimed, expired, or not found';

/**
 * Explains why the atomic claim UPDATE matched zero rows. Called with the
 * token row read AFTERWARDS (service role), or null if it does not exist.
 * Wrong org / wrong type are reported first so the caller learns the real
 * reason; nothing here consumes the token.
 */
export function diagnoseClaimFailure(
  row: ClaimTokenRow | null,
  expected: { orgId: string; type: string; typeError: string },
): ClaimFailure {
  if (!row) return { status: 404, error: NOT_CLAIMABLE };
  if (row.org_id !== expected.orgId) {
    return { status: 403, error: 'Token is not from your organization' };
  }
  if (row.payload?.type !== expected.type) {
    return { status: 400, error: expected.typeError };
  }
  // Right org and type, so it is already claimed or expired.
  return { status: 409, error: NOT_CLAIMABLE };
}
