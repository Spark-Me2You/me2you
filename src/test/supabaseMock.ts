/**
 * Test double for the Supabase client.
 *
 * Usage in a test file:
 *
 *   vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
 *   import { supabaseMock, queryResult, resetSupabaseMock } from '@/test/supabaseMock'
 *
 *   beforeEach(resetSupabaseMock)
 *   supabaseMock.from.mockReturnValue(queryResult({ data: [...] }))
 *
 * Query builders are chainable and thenable: every filter/modifier returns the
 * same builder (so `.calls` assertions work) and awaiting it resolves to
 * `{ data, error }`.
 */
import { vi, type Mock } from 'vitest'

export type QueryOutcome = {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'in',
  'is',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'or',
  'not',
  'order',
  'limit',
  'range',
  'single',
  'maybeSingle',
] as const

export type QueryBuilder = Record<(typeof CHAIN_METHODS)[number], Mock> & PromiseLike<unknown>

/** A chainable, awaitable PostgREST-style query builder resolving to `outcome`. */
export function queryResult(outcome: QueryOutcome = {}): QueryBuilder {
  const builder = {} as Record<string, unknown>
  for (const method of CHAIN_METHODS) builder[method] = vi.fn(() => builder)
  builder.then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve({ data: null, error: null, count: null, ...outcome }).then(resolve, reject)
  return builder as QueryBuilder
}

export const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  functions: { invoke: vi.fn() },
  storage: { from: vi.fn() },
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    setSession: vi.fn(),
    refreshSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}

/** Clears all recorded calls and queued return values on the shared mock. */
export function resetSupabaseMock(): void {
  const reset = (node: unknown) => {
    if (typeof node === 'function') (node as Mock).mockReset()
    else if (node && typeof node === 'object') Object.values(node).forEach(reset)
  }
  reset(supabaseMock)
}

type RealtimeFilter = { event: string; table: string }

/**
 * A fake realtime channel. Wire it up with `supabaseMock.channel.mockReturnValue(fake.channel)`,
 * then drive subscribers with `fake.emit('INSERT', 'table', { ...newRow })`.
 */
export function fakeChannel() {
  const handlers: Array<{ filter: RealtimeFilter; callback: (event: { new: unknown }) => unknown }> = []
  const channel = {
    on: vi.fn((_type: string, filter: RealtimeFilter, callback: (event: { new: unknown }) => unknown) => {
      handlers.push({ filter, callback })
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return {
    channel,
    handlers,
    emit: (event: string, table: string, newRow: unknown) =>
      Promise.all(
        handlers
          .filter((h) => h.filter.event === event && h.filter.table === table)
          .map((h) => h.callback({ new: newRow })),
      ),
  }
}
