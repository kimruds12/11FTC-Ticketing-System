import "server-only";
import { createApiClient } from "./http";
import { getServerToken } from "@/lib/auth";

/**
 * Server-side API client — for React Server Components and Server Actions. The token comes
 * from the request's cookies. `server-only` makes importing this from a Client Component a
 * build error, so the cookie-reading path can never leak into the browser bundle.
 */
export function serverApi() {
  return createApiClient(getServerToken);
}
