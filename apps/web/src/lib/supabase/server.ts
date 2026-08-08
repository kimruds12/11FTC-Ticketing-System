import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Server Supabase client — for Server Components, Server Actions and route handlers. Bound to
 * the request cookie store (Next 16: `cookies()` is async). Auth only; anon key only.
 *
 * No longer serves an OAuth code exchange: sign-in is email + password (ADR-0018), which
 * sets the session directly, so `/auth/callback` was removed rather than left as a route
 * nothing reaches.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (cookies are read-only there). The middleware
          // refreshes the session cookies instead — safe to ignore here.
        }
      },
    },
  });
}

/** Server-side session token for `Authorization: Bearer` (our API re-verifies it via JWKS). */
export async function getServerToken(): Promise<string | undefined> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
