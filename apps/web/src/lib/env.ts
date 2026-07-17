/**
 * Public runtime config for the web app. Only `NEXT_PUBLIC_*` values are readable in the
 * browser — never put a secret here (the `service_role` key must never reach the client;
 * see docs/implementation/frontend/auth.md).
 *
 * Defaults keep `next build` and CI green without a populated env; real values come from
 * the deployment environment (see .env.example).
 */
export const env = {
  /**
   * NestJS API base URL — Axios services (src/services) use this as their baseURL.
   * Includes the `/api/v1` prefix so service paths stay clean (`/tickets`, not
   * `/api/v1/tickets`). The API is URI-versioned (ADR-0012, docs/api/versioning.md); if a
   * single module ever moves to v2, that one service overrides its path/baseURL.
   */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  /** Supabase project URL — used by the Supabase Auth client (anon key only). */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  /** Supabase anon (publishable) key. Anon key ONLY in the browser. */
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
