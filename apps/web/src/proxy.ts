import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 "proxy" (formerly "middleware"). Two jobs, both lightweight and edge-cheap:
 *   1. Keep the Supabase session fresh on every request (token rotation + cookie sync).
 *   2. OPTIMISTICALLY bounce a session-less request off protected routes to /sign-in, so we
 *      don't render a protected Server Component just to redirect out of it.
 *
 * This is AUTHENTICATION only — it asks "is there a session?", never "what role?". Role-based
 * access is NOT enforced here: the API is the authoritative gate (global RolesGuard + @Roles),
 * and the UI hides admin-only nav cosmetically from the role in the app shell. Enforcing RBAC
 * in the proxy would duplicate authorization in the browser tier and is the Next.js
 * anti-pattern — middleware is optimistic; authorization belongs next to the data. The
 * authoritative session/allowlist gate stays in (app)/layout.tsx (`GET /me`). See
 * docs/implementation/frontend/auth.md.
 */

/** Paths reachable without a session: the sign-in screen and the OAuth callback. */
const PUBLIC_PATHS = ["/sign-in", "/auth"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    const redirect = NextResponse.redirect(url);
    // Preserve any cookies the session refresh just wrote (e.g. cleared stale tokens).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
