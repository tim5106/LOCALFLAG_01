import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let client: SupabaseClient | undefined;

export function getSupabaseAuthClient(): SupabaseClient | undefined {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return undefined;
  }

  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

