/**
 * Supabase browser client for Auth (Google, email).
 * Uses anon key; for DB use service role on the server only.
 */

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for auth"
    );
  }
  return createBrowserClient(url, anonKey);
}

export function hasAuth(): boolean {
  return !!(url && anonKey);
}
