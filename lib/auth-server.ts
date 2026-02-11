/**
 * Server-side auth: get current user from request (API routes, server components).
 * Uses Supabase Auth cookies; requires NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasAuth(): boolean {
  return !!(url && anonKey);
}

/**
 * Create a Supabase client for the server that can read auth cookies from the request.
 * Use in Route Handlers. For session refresh, set up middleware; here we only read.
 */
export function createServerSupabaseClient(request: Request) {
  if (!url || !anonKey) {
    return null;
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((c) => {
    const [name, ...v] = c.trim().split("=");
    return { name: name?.trim() ?? "", value: (v as string[]).join("=").trim() };
  });
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {
        // Route handler cannot set cookies on response here; middleware handles refresh
      },
    },
  });
}

/**
 * Get the current auth user from the request (e.g. in an API route).
 * Returns null if no session or auth not configured.
 */
export async function getSession(
  request: Request
): Promise<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null> {
  const supabase = createServerSupabaseClient(request);
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return {
    id: user.id,
    email: user.email ?? undefined,
    user_metadata: user.user_metadata as Record<string, unknown> | undefined,
  };
}
