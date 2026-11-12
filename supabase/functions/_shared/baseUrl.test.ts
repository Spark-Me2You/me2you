import { describe, it, expect } from 'vitest';
import { resolveAppBaseUrl } from './baseUrl.ts';

describe('resolveAppBaseUrl', () => {
  it('uses APP_BASE_URL when set, trimming trailing slashes', () => {
    expect(resolveAppBaseUrl('https://me2you.app/', 'https://x.supabase.co')).toBe('https://me2you.app');
  });
  it('falls back to localhost when running locally', () => {
    expect(resolveAppBaseUrl(undefined, 'http://127.0.0.1:54321')).toBe('http://localhost:5173');
    expect(resolveAppBaseUrl('', 'http://kong:8000')).toBe('http://localhost:5173');
    expect(resolveAppBaseUrl(undefined, 'http://localhost:54321')).toBe('http://localhost:5173');
  });
  it('returns null in a hosted project without APP_BASE_URL', () => {
    expect(resolveAppBaseUrl(undefined, 'https://abc.supabase.co')).toBeNull();
    expect(resolveAppBaseUrl(undefined, undefined)).toBeNull();
  });
});
