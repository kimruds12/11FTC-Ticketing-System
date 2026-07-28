import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * OAuth callback (PKCE). Google redirects here with a `code`; we exchange it for a Supabase
 * session (sets the cookies) and forward the user on. `next` is validated to be a local path
 * so it can't be turned into an open redirect.
 *
 * This route lives at the literal path `/auth/callback` — distinct from the `(auth)` route
 * group that holds the sign-in page. Add this URL to Supabase → Auth → URL Configuration →
 * Redirect URLs.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) next = "/dashboard";

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
