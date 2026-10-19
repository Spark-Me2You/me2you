/**
 * Mock Database
 * In-memory state behind the fake Supabase client used in Ladle stories.
 * Stories configure it through a Scenario (seed data, auth preset, latency, failures).
 */

import type { Session, User } from '@supabase/supabase-js';

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export type FunctionHandler = (body: Record<string, unknown>) => unknown | Promise<unknown>;

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface RealtimeListener {
  channel: object;
  table: string;
  event: RealtimeEvent | '*';
  callback: (payload: { new: Row; old: Row; eventType: RealtimeEvent; table: string }) => void;
}

type AuthListener = (event: string, session: Session | null) => void;

export interface AuthAccount {
  id: string;
  email: string;
  app_metadata?: Record<string, unknown>;
}

export interface MockState {
  tables: Tables;
  /** bucket -> path -> URL */
  storage: Record<string, Record<string, string>>;
  accounts: AuthAccount[];
  session: Session | null;
  functions: Record<string, FunctionHandler>;
  /** Latency applied to data calls; 'forever' never resolves (pure loading states). */
  delayMs: number | 'forever';
  /** Keys that fail: table names, `fn:<name>`, `storage`, `auth`. */
  failures: Set<string>;
}

const listeners = {
  realtime: [] as RealtimeListener[],
  auth: [] as AuthListener[],
};

export const state: MockState = {
  tables: {},
  storage: {},
  accounts: [],
  session: null,
  functions: {},
  delayMs: 0,
  failures: new Set(),
};

export function resetState(next: Partial<MockState>) {
  state.tables = structuredClone(next.tables ?? {});
  state.storage = structuredClone(next.storage ?? {});
  state.accounts = next.accounts ?? [];
  state.session = next.session ?? null;
  state.functions = next.functions ?? {};
  state.delayMs = next.delayMs ?? 0;
  state.failures = next.failures ?? new Set();
  listeners.realtime = [];
  listeners.auth = [];
}

export function table(name: string): Row[] {
  if (!state.tables[name]) state.tables[name] = [];
  return state.tables[name];
}

export async function latency() {
  if (state.delayMs === 'forever') {
    await new Promise(() => {});
  } else if (state.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, state.delayMs as number));
  }
}

export function failureFor(key: string) {
  if (!state.failures.has(key)) return null;
  return { message: `Mock failure: ${key}`, code: 'MOCK', details: '', hint: '' };
}

// ---------------------------------------------------------------------------
// Auth

export function buildSession(account: AuthAccount): Session {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const user = {
    id: account.id,
    email: account.email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: account.app_metadata ?? {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  } as User;
  return {
    access_token: `mock-access-${account.id}`,
    refresh_token: `mock-refresh-${account.id}`,
    expires_in: 3600,
    expires_at: nowSeconds + 3600,
    token_type: 'bearer',
    user,
  };
}

export function setSession(session: Session | null, event: string) {
  state.session = session;
  for (const listener of [...listeners.auth]) listener(event, session);
}

export function onAuthChange(listener: AuthListener) {
  listeners.auth.push(listener);
  return () => {
    listeners.auth = listeners.auth.filter((l) => l !== listener);
  };
}

// ---------------------------------------------------------------------------
// Realtime

export function addRealtimeListener(listener: RealtimeListener) {
  listeners.realtime.push(listener);
}

export function removeChannelListeners(channel: object) {
  listeners.realtime = listeners.realtime.filter((l) => l.channel !== channel);
}

/** Notify realtime subscribers. Called by the fake client on writes, or by stories directly. */
export function emit(tableName: string, event: RealtimeEvent, newRow: Row, oldRow: Row = {}) {
  for (const listener of [...listeners.realtime]) {
    if (listener.table !== tableName) continue;
    if (listener.event !== '*' && listener.event !== event) continue;
    listener.callback({ new: newRow, old: oldRow, eventType: event, table: tableName });
  }
}

/** Insert a row and broadcast it, as if another client wrote it. */
export function simulateInsert(tableName: string, row: Row) {
  table(tableName).push(row);
  emit(tableName, 'INSERT', row);
}
