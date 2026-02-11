/**
 * Supabase server client for persistence.
 * Use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env (from Supabase Dashboard > Project Settings > API).
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard > Project Settings > API)"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

/** Returns the Supabase client. Only call when hasSupabase() is true. */
export function supabase() {
  if (!_client) _client = getSupabase();
  return _client;
}

/** Use Supabase only when env is set; otherwise caller can fall back to KV. */
export function hasSupabase(): boolean {
  return !!(url && key);
}
