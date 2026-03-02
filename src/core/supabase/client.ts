/**
 * Supabase Client
 * Configured client for interacting with Supabase backend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Database type definitions
 * Defines the schema for all database tables
 */
export interface Database {
  public: {
    Tables: {
      organization: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organization']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['organization']['Insert']>;
      };
      user: {
        Row: {
          id: string;
          org_id: string | null;
          name: string | null;
          bio: string | null;
          photo_url: string | null;
          visibility: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user']['Insert']>;
      };
      org_admin: {
        Row: {
          id: string;
          org_id: string;
          auth_user_id: string;
          email: string | null;
          role: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['org_admin']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['org_admin']['Insert']>;
      };
      image: {
        Row: {
          id: string;
          owner_id: string;
          storage_path: string;
          category: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['image']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['image']['Insert']>;
      };
    };
  };
}

/**
 * Initialize Supabase client immediately (not lazy)
 * This avoids issues with Proxy and ensures client is ready
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing client...', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables. Please check your .env file.\n' +
    `VITE_SUPABASE_URL: ${supabaseUrl ? 'set' : 'MISSING'}\n` +
    `VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'set' : 'MISSING'}`;
  console.error('[Supabase]', errorMsg);
  throw new Error(errorMsg);
}

/**
 * Supabase client instance - initialized once at module load
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable since we're not using OAuth redirects
  },
});

console.log('[Supabase] Client initialized successfully');

/**
 * Legacy function for backwards compatibility
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};
