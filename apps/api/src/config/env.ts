import { z } from "zod";

/**
 * Boot-time environment validation. A missing `DATABASE_URL` (or malformed config) must
 * fail fast with a clear message here — not as a null-pointer three calls deep (see
 * docs/implementation/00-backend-overview.md §Configuration).
 *
 * Wired into `ConfigModule.forRoot({ validate })`; Nest calls `validateEnv` at startup and
 * refuses to boot on any error. Keep this the single source of truth for process config —
 * inject `ConfigService<Env, true>` and read typed values, never `process.env` directly.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Postgres — Supabase SESSION pooler (5432). Required; the app cannot run without it.
  // NOT z.url(): a connection string's password often contains characters a strict URL
  // parser rejects, and `pg` parses the string itself. Just require the postgres scheme.
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => /^postgres(ql)?:\/\//.test(v), {
      message: "DATABASE_URL must be a postgres connection string (postgres://…)",
    }),

  // Supabase Auth (M1). JWTs are verified locally against the JWKS — no per-request round
  // trip. Assumes asymmetric signing (ES256); if the project uses legacy HS256, swap the
  // JWKS URL for a shared-secret var here and in the verifier (ADR-0013 watch-out).
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),

  /**
   * Service-role key — required, because account provisioning (ADR-0018) calls GoTrue's admin
   * API with it. Validated here so a missing key fails at BOOT with a named variable, rather
   * than at 2pm when an administrator tries to invite someone and gets a 401 from a service
   * they did not know was involved.
   *
   * It bypasses RLS and every policy. Server-side only — it must never reach the browser, so
   * it is deliberately NOT prefixed `NEXT_PUBLIC_`.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Ticket-number scope (M3 / OPEN-1). 'year' → IT-2026-0174; 'date' → IT-2026-0715-001.
  TICKET_NUMBER_SCOPE: z.enum(["date", "year"]).default("year"),

  API_PORT: z.coerce.number().int().positive().default(3001),

  /**
   * Browser origins allowed to call this API (comma-separated).
   *
   * The web app's Server Components talk to the API server-to-server and are unaffected by
   * CORS — but anything the BROWSER fetches (the dashboard's live analytics, the employee and
   * technician pickers) is blocked without this. Failure is invisible server-side: the request
   * never arrives, so there is nothing in the API log, and the page just renders empty.
   *
   * An allowlist, never `*`: these endpoints are authenticated with a bearer token, and a
   * wildcard would let any site on the internet make credentialed calls on a signed-in user's
   * behalf.
   */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

/** ConfigModule `validate` hook — parses+coerces, throws a readable error on any miss. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
