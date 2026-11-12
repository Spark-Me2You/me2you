/**
 * Resolves the public app base URL used in QR / claim links.
 * Falls back to the local dev URL only when the function itself is running
 * locally (SUPABASE_URL points at localhost, 127.0.0.1 or the kong gateway);
 * in a hosted project a missing APP_BASE_URL is a misconfiguration (null).
 * Pure: no Deno globals or remote imports.
 */
export const LOCAL_APP_BASE_URL = 'http://localhost:5173';

export function resolveAppBaseUrl(
  appBaseUrl: string | undefined | null,
  supabaseUrl: string | undefined | null,
): string | null {
  if (appBaseUrl) return appBaseUrl.replace(/\/+$/, '');
  if (supabaseUrl && /localhost|127\.0\.0\.1|kong/i.test(supabaseUrl)) return LOCAL_APP_BASE_URL;
  return null;
}
