import axios, { type AxiosError, type AxiosInstance } from "axios";
import { env } from "@/lib/env";
import { toAppError } from "./errors";

/**
 * The single Axios factory for the whole web app. Axios lives ONLY in src/services — no
 * component, hook, or slice imports it directly (see architecture.md import rules).
 *
 * `getToken` is injected so the same service functions run on the server (token from
 * cookies) and in the browser (token from the Supabase SDK) — see server.ts / browser.ts.
 */
export type TokenProvider = () => Promise<string | undefined> | string | undefined;

/**
 * `baseURL` defaults to the browser-facing URL. The SERVER side overrides it, because the two
 * tiers reach the API at different hosts once containerised: the browser goes through the
 * published port (`localhost:3001`), while the web container must use the compose service name
 * (`api:3001`) — inside that container `localhost` is the web app itself. See server.ts.
 */
export function createApiClient(
  getToken: TokenProvider,
  baseURL: string = env.apiUrl,
): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
  });

  // Attach the session JWT. The browser never verifies it — the API does, via JWKS (M1).
  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  // Normalize every failure to AppError so callers branch on a stable shape.
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => Promise.reject(toAppError(error)),
  );

  return client;
}
