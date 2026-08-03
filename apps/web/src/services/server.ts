import "server-only";
import { createApiClient } from "./http";
import { env } from "@/lib/env";
import { getServerToken } from "@/lib/supabase/server";

/**
 * Server-side API client — for React Server Components and Server Actions. The token comes
 * from the request's cookies. `server-only` makes importing this from a Client Component a
 * build error, so the cookie-reading path can never leak into the browser bundle.
 *
 * `API_INTERNAL_URL` exists because the server tier and the browser reach the API at different
 * addresses once containerised. The browser uses the published port
 * (`NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`), but inside the web container
 * `localhost:3001` is the web app itself — server-side calls must go to the compose service
 * name (`http://api:3001/api/v1`). Unset outside Docker, where both are the same host.
 *
 * It is NOT a `NEXT_PUBLIC_*` var on purpose: this module is server-only, so the value never
 * reaches the client bundle.
 */
export function serverApi() {
  const baseURL = process.env.API_INTERNAL_URL ?? env.apiUrl;
  return createApiClient(getServerToken, baseURL);
}
