/**
 * Validates the temp-drawings storage path a kiosk put in a claim payload.
 * The service role downloads it, so it must stay inside the org's folder.
 * Pure: no Deno globals or remote imports.
 */
export function isSafeTempDrawingPath(path: unknown, orgId: string): path is string {
  if (typeof path !== 'string' || !orgId) return false;
  if (path.startsWith('/') || path.includes('\\')) return false;
  if (!path.startsWith(`${orgId}/`)) return false;
  if (path.length === orgId.length + 1) return false;
  return !path.split('/').some((seg) => seg === '..');
}
