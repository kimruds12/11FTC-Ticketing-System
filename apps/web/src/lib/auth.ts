/**
 * Session/token helpers. The browser only ever holds the Supabase **anon key** and the
 * user's session JWT; it never verifies the JWT (the API does, via JWKS — M1). These
 * helpers only *source* the token so the Axios layer (src/services) can attach it.
 *
 * NOTE: split the server/browser token helpers into separate modules so the
 * server one (which reads cookies via `next/headers`) never gets pulled into a client
 * bundle. Kept together here only while the server token is still a stub.
 */

/** Server-side token source — reads the Supabase session cookie (RSC + server actions). */
export async function getServerToken(): Promise<string | undefined> {
  // TODO(auth/M1): read the Supabase access token from cookies via next/headers.
  return undefined;
}

/** Browser-side token source — reads the live Supabase session (client thunks/hooks). */
export async function getBrowserToken(): Promise<string | undefined> {
  // Dynamic import so the "use client" Supabase browser client is never pulled
  // into a server bundle.
  const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
