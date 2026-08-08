/**
 * The auth cookie name, pinned explicitly for every Supabase client in this app.
 *
 * By default supabase-js derives it from the URL it was given:
 *
 *   `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
 *   — @supabase/supabase-js/src/SupabaseClient.ts
 *
 * That is fine while the browser and the server use the same URL, and silently broken the
 * moment they cannot. In Docker they cannot: the browser reaches Supabase at
 * `localhost:8000` while the server must use `host.docker.internal:8000`, because inside a
 * container `localhost` is the container. The derived names then diverge —
 * `sb-localhost-auth-token` versus `sb-host-auth-token` — so the browser writes a session
 * cookie the server never looks for.
 *
 * The failure gives no error anywhere. Sign-in succeeds, the auth server logs 200, the cookie
 * is set, and every subsequent request is redirected back to sign-in as unauthenticated.
 *
 * Pinning the name removes the dependency on the URL entirely, and keeps it stable if the
 * host changes again for deployment.
 */
export const AUTH_COOKIE_NAME = "sb-11ftc-auth-token";
