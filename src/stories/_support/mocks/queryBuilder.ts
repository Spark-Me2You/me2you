/**
 * Fake PostgREST query builder
 * Supports the subset of supabase-js used by the app: select (with embedded
 * many-to-one relations), insert/update/upsert/delete, eq/neq/in/gt/gte/lt/lte/is/match,
 * order, limit, range, single, maybeSingle, and exact counts.
 * Anything unsupported throws, so gaps surface immediately in a story.
 */

import { emit, failureFor, latency, table, type Row } from './mockDb';

type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
type Filter = (row: Row) => boolean;

interface Result {
  data: unknown;
  error: { message: string; code: string } | null;
  count: number | null;
  status: number;
  statusText: string;
}

/**
 * Embedded relation columns for joins like `user (...)` or `owner:user!hint(...)`.
 * Keyed by `<source table>.<target table>`; the value is the foreign-key column on the source.
 */
const RELATION_FKS: Record<string, string> = {
  'gesture_image.user': 'owner_id',
  'cropped_image.user': 'owner_id',
  'drawings.user': 'owner_id',
  'messages.user': 'from_user_id',
  'game_score.user': 'owner_id',
};

interface Embed {
  alias: string;
  table: string;
  hint: string | null;
  columns: string;
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function parseColumn(part: string): string | Embed {
  const match = part.match(/^(?:(\w+)\s*:\s*)?(\w+)(?:\s*!\s*(\w+))?\s*\((.*)\)$/s);
  if (!match) return part;
  const [, alias, target, hint, columns] = match;
  return { alias: alias ?? target, table: target, hint: hint ?? null, columns };
}

function resolveFk(source: string, embed: Embed, row: Row): string {
  if (embed.hint) {
    if (embed.hint in row) return embed.hint;
    const prefix = `${source}_`;
    if (embed.hint.startsWith(prefix) && embed.hint.endsWith('_fkey')) {
      return embed.hint.slice(prefix.length, -'_fkey'.length);
    }
  }
  const known = RELATION_FKS[`${source}.${embed.table}`];
  if (known) return known;
  throw new Error(`[mock supabase] Unknown relation ${source} -> ${embed.table}; add it to RELATION_FKS`);
}

export function project(source: string, row: Row, columns: string): Row {
  const parts = splitTopLevel(columns || '*');
  const out: Row = {};
  for (const part of parts) {
    const col = parseColumn(part);
    if (typeof col === 'string') {
      if (col === '*') Object.assign(out, row);
      else out[col] = row[col] ?? null;
      continue;
    }
    const fk = resolveFk(source, col, row);
    const related = table(col.table).find((r) => r.id === row[fk]);
    out[col.alias] = related ? project(col.table, related, col.columns) : null;
  }
  return out;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return (a as number | string) < (b as number | string) ? -1 : 1;
}

export class QueryBuilder implements PromiseLike<Result> {
  private op: Op = 'select';
  private columns = '*';
  private returning = false;
  private countMode = false;
  private head = false;
  private payload: Row[] = [];
  private patch: Row = {};
  private conflictKey = 'id';
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private cardinality: 'many' | 'single' | 'maybeSingle' = 'many';

  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns = '*', options?: { count?: string; head?: boolean }) {
    if (this.op === 'select') {
      this.columns = columns;
    } else {
      this.returning = true;
      this.columns = columns;
    }
    this.countMode = !!options?.count;
    this.head = !!options?.head;
    return this;
  }

  insert(values: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  upsert(values: Row | Row[], options?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = Array.isArray(values) ? values : [values];
    this.conflictKey = options?.onConflict ?? 'id';
    return this;
  }

  update(values: Row) {
    this.op = 'update';
    this.patch = values;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push((row) => compare(row[column], value) > 0);
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push((row) => compare(row[column], value) >= 0);
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push((row) => compare(row[column], value) < 0);
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push((row) => compare(row[column], value) <= 0);
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  match(query: Row) {
    for (const [column, value] of Object.entries(query)) this.eq(column, value);
    return this;
  }

  filter(column: string, operator: string, value: unknown) {
    const ops: Record<string, (c: string, v: unknown) => this> = {
      eq: this.eq,
      neq: this.neq,
      gt: this.gt,
      gte: this.gte,
      lt: this.lt,
      lte: this.lte,
      is: this.is,
    };
    const fn = ops[operator];
    if (!fn) throw new Error(`[mock supabase] filter operator "${operator}" is not supported`);
    return fn.call(this, column, value);
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.rangeFrom = this.rangeFrom ?? 0;
    this.rangeTo = this.rangeFrom + count - 1;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.cardinality = 'single';
    return this;
  }

  maybeSingle() {
    this.cardinality = 'maybeSingle';
    return this;
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private matches(row: Row) {
    return this.filters.every((f) => f(row));
  }

  private async execute(): Promise<Result> {
    await latency();
    const failure = failureFor(this.tableName);
    if (failure) return { data: null, error: failure, count: null, status: 400, statusText: 'Bad Request' };

    const rows = table(this.tableName);
    let affected: Row[];

    switch (this.op) {
      case 'select':
        affected = rows.filter((r) => this.matches(r));
        break;
      case 'insert':
        affected = this.payload.map((values) => ({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...values,
        }));
        rows.push(...affected);
        affected.forEach((row) => emit(this.tableName, 'INSERT', row));
        break;
      case 'upsert':
        affected = this.payload.map((values) => {
          const existing = rows.find((r) => r[this.conflictKey] === values[this.conflictKey]);
          if (existing) {
            Object.assign(existing, values);
            emit(this.tableName, 'UPDATE', existing);
            return existing;
          }
          const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...values };
          rows.push(row);
          emit(this.tableName, 'INSERT', row);
          return row;
        });
        break;
      case 'update':
        affected = rows.filter((r) => this.matches(r));
        affected.forEach((row) => {
          const old = { ...row };
          Object.assign(row, this.patch);
          emit(this.tableName, 'UPDATE', row, old);
        });
        break;
      case 'delete':
        affected = rows.filter((r) => this.matches(r));
        this.removeRows(affected);
        affected.forEach((row) => emit(this.tableName, 'DELETE', {}, row));
        break;
    }

    const total = affected.length;

    if (this.op !== 'select' && !this.returning) {
      return { data: null, error: null, count: this.countMode ? total : null, status: 201, statusText: 'OK' };
    }

    let result = [...affected];
    if (this.orders.length > 0) {
      result.sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const c = compare(a[column], b[column]);
          if (c !== 0) return ascending ? c : -c;
        }
        return 0;
      });
    }
    if (this.rangeFrom !== null) {
      result = result.slice(this.rangeFrom, (this.rangeTo ?? result.length - 1) + 1);
    }

    const projected = result.map((row) => project(this.tableName, row, this.columns));
    const count = this.countMode ? total : null;

    if (this.head) return { data: null, error: null, count, status: 200, statusText: 'OK' };

    if (this.cardinality === 'many') {
      return { data: projected, error: null, count, status: 200, statusText: 'OK' };
    }
    if (projected.length > 1 || (projected.length === 0 && this.cardinality === 'single')) {
      return {
        data: null,
        error: {
          message: `JSON object requested, multiple (or no) rows returned (${projected.length})`,
          code: 'PGRST116',
        },
        count,
        status: 406,
        statusText: 'Not Acceptable',
      };
    }
    return { data: projected[0] ?? null, error: null, count, status: 200, statusText: 'OK' };
  }

  private removeRows(toRemove: Row[]) {
    const rows = table(this.tableName);
    for (const row of toRemove) {
      const index = rows.indexOf(row);
      if (index >= 0) rows.splice(index, 1);
    }
  }
}
