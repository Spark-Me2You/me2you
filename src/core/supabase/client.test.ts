import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createClient = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient }))

const URL = 'https://example.supabase.co'
const KEY = 'anon-key'

async function loadClient() {
  vi.resetModules()
  return import('./client')
}

beforeEach(() => {
  createClient.mockReset()
  createClient.mockReturnValue({ marker: 'client' })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('supabase client', () => {
  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', KEY)

    await expect(loadClient()).rejects.toThrow(/VITE_SUPABASE_URL/)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(loadClient()).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('throws when both variables are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(loadClient()).rejects.toThrow()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('creates the client with the configured url, key and session-persisting auth options', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', KEY)

    const mod = await loadClient()

    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith(URL, KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
    expect(mod.supabase).toEqual({ marker: 'client' })
  })

  it('getSupabaseClient returns the same singleton instance', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', KEY)

    const mod = await loadClient()

    expect(mod.getSupabaseClient()).toBe(mod.supabase)
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})
