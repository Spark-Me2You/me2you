/**
 * Edge function mocks
 * Default handlers for `supabase.functions.invoke`, mirroring the response shapes
 * of `supabase/functions/*`. Stories override any of them via `scenario.functions`.
 */

import { buildSession, emit, state, table, type FunctionHandler, type Row } from './mockDb';

const MOCK_ORIGIN = 'https://me2you.example';

function currentUserId(): string {
  const id = state.session?.user.id;
  if (!id) throw new Error('Unauthorized');
  return id;
}

function currentOrgId(): string | null {
  const meta = state.session?.user.app_metadata?.org_id as string | undefined;
  if (meta) return meta;
  const userId = state.session?.user.id;
  const row = table('user').find((u) => u.id === userId);
  return (row?.org_id as string | undefined) ?? null;
}

/** Claims a pending token as the current user, as the claim edge functions do. */
function claimToken(tokenId: unknown): Row {
  const token = table('claim_tokens').find((t) => t.id === tokenId);
  if (!token || token.status !== 'pending') {
    throw new Error('Token is not claimable — already claimed, expired, or not found');
  }
  const old = { ...token };
  token.status = 'claimed';
  token.claimed_by = currentUserId();
  emit('claim_tokens', 'UPDATE', token, old);
  return token;
}

export const defaultFunctions: Record<string, FunctionHandler> = {
  'generate-registration-qr': () => {
    const token = `mock-reg-${crypto.randomUUID()}`;
    return {
      success: true,
      token,
      url: `${MOCK_ORIGIN}/register?token=${token}`,
      expires_at: Date.now() + 5 * 60_000,
      expires_in_seconds: 300,
    };
  },

  'verify-registration-token': ({ token }) => {
    if (typeof token !== 'string' || !token) {
      return { success: false, error: 'Missing token', error_code: 'MISSING_TOKEN' };
    }
    if (token.includes('expired')) {
      return { success: false, error: 'This QR code has expired', error_code: 'TOKEN_EXPIRED' };
    }
    if (token.includes('invalid')) {
      return { success: false, error: 'Invalid registration link', error_code: 'INVALID_TOKEN' };
    }
    const org = table('organization')[0];
    return { success: true, org_id: org?.id ?? 'org-demo', org_name: org?.name ?? 'Demo Org' };
  },

  'generate-claim-token': ({ payload }) => {
    const row = {
      id: crypto.randomUUID(),
      org_id: currentOrgId(),
      payload,
      status: 'pending',
      claimed_by: null,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      created_at: new Date().toISOString(),
    };
    table('claim_tokens').push(row);
    emit('claim_tokens', 'INSERT', row);
    return { success: true, token_id: row.id, claim_url: `${MOCK_ORIGIN}/claim/${row.id}`, expires_at: row.expires_at };
  },

  'execute-claim': ({ token_id }) => {
    const token = claimToken(token_id);
    const payload = token.payload as { type?: string; data?: Row };
    // Mirrors the handle_game_score_claim trigger (migration 016).
    if (payload.type === 'game_score') {
      const row = {
        id: crypto.randomUUID(),
        owner_id: currentUserId(),
        org_id: token.org_id,
        game_id: payload.data?.game_id,
        score: payload.data?.score,
        metadata: payload.data ?? null,
        created_at: new Date().toISOString(),
      };
      table('game_score').push(row);
      emit('game_score', 'INSERT', row);
    }
    return { success: true, token_id: token.id, payload: token.payload };
  },

  'claim-drawing': ({ token_id }) => {
    const token = claimToken(token_id);
    const data = (token.payload as { data?: Row }).data ?? {};
    const drawingId = crypto.randomUUID();
    const imagePath = `${currentUserId()}/drawing-${drawingId}.png`;
    const row = {
      id: drawingId,
      owner_id: currentUserId(),
      org_id: token.org_id,
      image_path: imagePath,
      prompt: data.prompt ?? null,
      created_at: new Date().toISOString(),
    };
    table('drawings').push(row);
    emit('drawings', 'INSERT', row);
    return { success: true, token_id: token.id, drawing_id: drawingId, image_path: imagePath };
  },

  'claim-message': ({ token_id, body }) => {
    const token = claimToken(token_id);
    const data = (token.payload as { data?: Row }).data ?? {};
    const row = {
      id: crypto.randomUUID(),
      from_user_id: currentUserId(),
      to_user_id: data.recipient_id,
      org_id: token.org_id,
      body: String(body ?? '').trim(),
      read_at: null,
      created_at: new Date().toISOString(),
    };
    table('messages').push(row);
    emit('messages', 'INSERT', row);
    return { success: true, token_id: token.id, message_id: row.id };
  },

  'mint-kiosk-session': ({ org_id }) => {
    const account = {
      id: `kiosk-${String(org_id)}`,
      email: `kiosk+${String(org_id)}@me2you.example`,
      app_metadata: { is_kiosk: true, org_id },
    };
    if (!state.accounts.some((a) => a.id === account.id)) state.accounts.push(account);
    const session = buildSession(account);
    return {
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      kiosk_user_id: account.id,
      org_id,
    };
  },

  'delete-user-images': () => {
    const userId = currentUserId();
    const removeOwned = (name: string) => {
      const rows = table(name);
      const owned = rows.filter((r) => r.owner_id === userId);
      state.tables[name] = rows.filter((r) => r.owner_id !== userId);
      return owned.length;
    };
    const gesture = removeOwned('gesture_image');
    const cropped = removeOwned('cropped_image');
    return {
      success: true,
      gesture_rows_deleted: gesture,
      cropped_rows_deleted: cropped,
      storage_objects_deleted: gesture + cropped,
    };
  },

  'delete-user-account': () => {
    const userId = currentUserId();
    state.tables.user = table('user').filter((u) => u.id !== userId);
    state.accounts = state.accounts.filter((a) => a.id !== userId);
    return { success: true, storage_objects_deleted: 0, auth_user_deleted: true };
  },
};
