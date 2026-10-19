/**
 * Fake Supabase client
 * Swapped in for `src/core/supabase/client.ts` by the Ladle Vite config, so every
 * service and component that imports `supabase` talks to the in-memory mock DB.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  addRealtimeListener,
  buildSession,
  failureFor,
  latency,
  onAuthChange,
  removeChannelListeners,
  setSession,
  state,
  type RealtimeEvent,
  type Row,
} from './mockDb';
import { QueryBuilder } from './queryBuilder';
import { defaultFunctions } from './edgeFunctions';
import { placeholderImageUrl } from '../fixtures/images';

const ok = <T>(data: T) => ({ data, error: null });
const authError = (message: string) => ({ message, code: 'invalid_credentials', status: 400, name: 'AuthApiError' });

// ---------------------------------------------------------------------------
// Auth

const auth = {
  getSession: async () => ok({ session: state.session }),

  getUser: async () => ok({ user: state.session?.user ?? null }),

  refreshSession: async () => {
    if (!state.session) return { data: { session: null, user: null }, error: authError('No session') };
    const account = { id: state.session.user.id, email: state.session.user.email ?? '', app_metadata: state.session.user.app_metadata };
    const session = buildSession(account);
    setSession(session, 'TOKEN_REFRESHED');
    return ok({ session, user: session.user });
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    const unsubscribe = onAuthChange(callback);
    queueMicrotask(() => callback('INITIAL_SESSION', state.session));
    return { data: { subscription: { id: crypto.randomUUID(), callback, unsubscribe } } };
  },

  signInWithPassword: async ({ email }: { email: string; password: string }) => {
    const failure = failureFor('auth');
    const account = state.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (failure || !account) {
      return { data: { user: null, session: null }, error: authError(failure?.message ?? 'Invalid login credentials') };
    }
    const session = buildSession(account);
    setSession(session, 'SIGNED_IN');
    return ok({ user: session.user, session });
  },

  signUp: async ({ email }: { email: string; password: string }) => {
    const failure = failureFor('auth');
    if (failure) return { data: { user: null, session: null }, error: authError(failure.message) };
    if (state.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      return { data: { user: null, session: null }, error: { ...authError('User already registered'), code: 'user_already_exists' } };
    }
    const account = { id: crypto.randomUUID(), email };
    state.accounts.push(account);
    const session = buildSession(account);
    setSession(session, 'SIGNED_IN');
    return ok({ user: session.user, session });
  },

  setSession: async ({ access_token }: { access_token: string; refresh_token: string }) => {
    const account = state.accounts.find((a) => `mock-access-${a.id}` === access_token);
    if (!account) return { data: { user: null, session: null }, error: authError('Invalid token') };
    const session = buildSession(account);
    setSession(session, 'SIGNED_IN');
    return ok({ user: session.user, session });
  },

  signOut: async () => {
    setSession(null, 'SIGNED_OUT');
    return { error: null };
  },
};

// ---------------------------------------------------------------------------
// Storage

function bucket(name: string) {
  const objects = () => (state.storage[name] ??= {});
  const failed = () => failureFor('storage');

  return {
    upload: async (path: string, file: Blob) => {
      await latency();
      const failure = failed();
      if (failure) return { data: null, error: failure };
      objects()[path] = URL.createObjectURL(file);
      return ok({ path, id: crypto.randomUUID(), fullPath: `${name}/${path}` });
    },
    createSignedUrl: async (path: string) => {
      await latency();
      const failure = failed();
      if (failure) return { data: null, error: failure };
      return ok({ signedUrl: objects()[path] ?? placeholderImageUrl(path) });
    },
    getPublicUrl: (path: string) => ok({ publicUrl: objects()[path] ?? placeholderImageUrl(path) }),
    download: async (path: string) => {
      const response = await fetch(objects()[path] ?? placeholderImageUrl(path));
      return ok(await response.blob());
    },
    remove: async (paths: string[]) => {
      await latency();
      const failure = failed();
      if (failure) return { data: null, error: failure };
      paths.forEach((p) => delete objects()[p]);
      return ok(paths.map((p) => ({ name: p })));
    },
  };
}

// ---------------------------------------------------------------------------
// Edge functions

const functions = {
  invoke: async <T = unknown>(name: string, options?: { body?: Record<string, unknown> }) => {
    await latency();
    const failure = failureFor(`fn:${name}`);
    if (failure) return { data: null as T | null, error: { name: 'FunctionsHttpError', message: failure.message } };
    const handler = state.functions[name] ?? defaultFunctions[name];
    if (!handler) {
      return { data: null as T | null, error: { name: 'FunctionsHttpError', message: `No mock handler for edge function "${name}"` } };
    }
    try {
      return { data: (await handler(options?.body ?? {})) as T, error: null };
    } catch (e) {
      return { data: null as T | null, error: { name: 'FunctionsHttpError', message: e instanceof Error ? e.message : String(e) } };
    }
  },
};

// ---------------------------------------------------------------------------
// Realtime

interface ChannelFilter {
  event: RealtimeEvent | '*';
  table: string;
}

function channel(name: string) {
  const ch = {
    topic: `realtime:${name}`,
    on(_type: string, filter: ChannelFilter, callback: (payload: { new: Row; old: Row }) => void) {
      addRealtimeListener({ channel: ch, table: filter.table, event: filter.event, callback });
      return ch;
    },
    subscribe(callback?: (status: string, err?: Error) => void) {
      queueMicrotask(() => callback?.('SUBSCRIBED'));
      return ch;
    },
    unsubscribe: async () => {
      removeChannelListeners(ch);
      return 'ok';
    },
  };
  return ch;
}

// ---------------------------------------------------------------------------

const client = {
  from: (tableName: string) => new QueryBuilder(tableName),
  auth,
  storage: { from: bucket },
  functions,
  channel,
  removeChannel: async (ch: object) => {
    removeChannelListeners(ch);
    return 'ok';
  },
  removeAllChannels: async () => [],
};

// The real client type is used so call sites keep their inferred types.
export const supabase = client as unknown as SupabaseClient;

export const getSupabaseClient = () => supabase;
