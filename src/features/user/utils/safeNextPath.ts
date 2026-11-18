/**
 * Where to go after sign-in. Only in-app user and claim pages are allowed, so
 * a crafted ?next= can't send someone to another site ("//evil.com").
 */
export function safeNextPath(next: string | null): string {
  if (next && /^\/(user|claim)\//.test(next) && !next.startsWith("//")) return next;
  return "/user/profile";
}
