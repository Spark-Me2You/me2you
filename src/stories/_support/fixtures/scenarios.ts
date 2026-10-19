/**
 * Scenarios
 * A scenario fully describes the mock backend for one story: who is signed in,
 * which rows exist, how slow responses are and which calls fail.
 *
 * Stories pick a scenario through serializable `meta` (read by the global Ladle
 * provider), or wrap themselves in <Scenario> for one-off data tweaks.
 */

import { buildSession, resetState, type AuthAccount, type FunctionHandler, type Tables } from '../mocks/mockDb';
import { ACCOUNTS, ADMIN_ID, KIOSK_ID, ME_ID, NEW_USER_ID, seedTables } from './data';

export type AuthPreset = 'unauthenticated' | 'user' | 'user-new' | 'user-no-profile' | 'admin' | 'kiosk';

/** A signed-in auth account with no row in the "user" table (mid-registration). */
const GHOST_ACCOUNT: AuthAccount = { id: 'user-ghost', email: 'ghost@me2you.example' };

const PRESET_ACCOUNT: Record<AuthPreset, string | null> = {
  unauthenticated: null,
  user: ME_ID,
  'user-new': NEW_USER_ID,
  'user-no-profile': GHOST_ACCOUNT.id,
  admin: ADMIN_ID,
  kiosk: KIOSK_ID,
};

export interface ScenarioOptions {
  auth?: AuthPreset;
  /** 'default' seeds the demo org; 'empty' starts with no rows at all. */
  seed?: 'default' | 'empty';
  /** Mutate the seeded tables before the story renders. */
  tables?: (tables: Tables) => void;
  /** Milliseconds added to every data call, or 'forever' to hold loading states. */
  delay?: number | 'forever';
  /** Failure keys: table names, `fn:<edge function>`, `storage`, `auth`. */
  fail?: string[];
  /** Override edge function handlers. */
  functions?: Record<string, FunctionHandler>;
}

export function applyScenario(options: ScenarioOptions = {}) {
  const tables = options.seed === 'empty' ? {} : seedTables();
  options.tables?.(tables);

  const accounts = [...ACCOUNTS, GHOST_ACCOUNT];
  const accountId = PRESET_ACCOUNT[options.auth ?? 'unauthenticated'];
  const account = accounts.find((a) => a.id === accountId);

  resetState({
    tables,
    accounts,
    session: account ? buildSession(account) : null,
    functions: options.functions,
    delayMs: options.delay ?? 0,
    failures: new Set(options.fail ?? []),
  });
}
