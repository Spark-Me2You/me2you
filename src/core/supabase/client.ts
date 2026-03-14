/**
 * Supabase Client
 * Initializes and exports the Supabase client for database and auth operations
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

/**
 * Supabase client instance
 *
 * Configuration options:
 * - autoRefreshToken: Automatically refresh the auth token before it expires
 * - persistSession: Persist the auth session in localStorage
 * - detectSessionInUrl: Disabled since we're not using OAuth flows
 *
 * TODO: Consider adding additional configuration options:
 * - Custom auth storage (e.g., sessionStorage instead of localStorage)
 * - Custom fetch implementation for better error handling
 * - Real-time subscription settings if needed
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get the Supabase client instance
 * @returns Supabase client
 */
export const getSupabaseClient = () => supabase;
