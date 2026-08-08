import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { AUTH_COOKIE_NAME } from "./cookie-name";

/**
 * Refreshes the Supabase session on every request and writes the rotated cookies onto the
 * response, so Server Components always see a fresh token. This is the canonical
 * `@supabase/ssr` middleware pattern — `getUser()` triggers the refresh + revalidation.
 *
 * Returns the refreshed response together with the resolved user, so the proxy can make an
 * OPTIMISTIC auth redirect (edge-level, authentication only — never role-based; roles are
 * authoritative in the API and cosmetic in the UI shell, see
 * docs/implementation/frontend/auth.md).
 *
 * Do NOT run logic between creating the client and calling `getUser()`.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseInternalUrl, env.supabaseAnonKey, {
    // Must match the browser client exactly — see cookie-name.ts.
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user };
}
