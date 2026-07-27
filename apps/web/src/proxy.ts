import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 "proxy" (formerly "middleware"). Keeps the Supabase session fresh on every request
 * (token rotation + cookie sync). Route protection itself is done in `(app)/layout.tsx`
 * (server session check) — this only refreshes; it does not authorize.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
