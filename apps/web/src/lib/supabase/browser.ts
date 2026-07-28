"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser Supabase client — AUTH ONLY (Google OAuth sign-in + reading the session). The
 * CLAUDE.md "no supabase-js" rule is scoped to DATA access (PostgREST); using the auth
 * client here is the intended path (ADR-0013). Anon key only; never the service_role key.
 *
 * Memoized so the whole app shares one client (one session listener).
 */
let client: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabase() {
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}

/** The session access token to forward as `Authorization: Bearer` to our API (verified there via JWKS). */
export async function getBrowserToken(): Promise<string | undefined> {
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session?.access_token;
}
