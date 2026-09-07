import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.js";

/**
 * The GoTrue (Supabase Auth) **admin** API, over plain `fetch`.
 *
 * WHY NOT `supabase-js`. `CLAUDE.md` bans that package, and the reason is specific: it speaks
 * PostgREST, which cannot run the multi-statement transactions FR-31 depends on. That ban is
 * about DATA access, and account provisioning is not data access — but pulling the package in
 * "just for auth" puts it one import away from the ticket path, and the next person will not
 * know which half was allowed. Four endpoints over `fetch` costs less than blurring the rule.
 *
 * Every call carries the SERVICE ROLE key, which bypasses RLS and every policy. It is read
 * from config, never logged, and never leaves the server — nothing here is reachable from the
 * browser except through this API's own admin-guarded routes.
 */
export interface GoTrueUser {
  id: string;
  email: string;
}

@Injectable()
export class GoTrueAdminService {
  private readonly logger = new Logger(GoTrueAdminService.name);
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(config: ConfigService<Env, true>) {
    // The address to CONNECT to, which is not always the canonical one: inside a container
    // `localhost` is the container itself. Falls back to SUPABASE_URL when unset.
    // `String(...)` rather than a cast: making SUPABASE_INTERNAL_URL optional widens what
    // ConfigService.get returns for BOTH keys, and a cast would just hide that.
    const internal = config.get("SUPABASE_INTERNAL_URL", { infer: true });
    const canonical = config.get("SUPABASE_URL", { infer: true });
    this.baseUrl = String(internal ?? canonical).replace(/\/$/, "");
    this.serviceRoleKey = config.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true });
  }

  private async call<T>(
    path: string,
    init: { method: string; body?: unknown },
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/auth/v1${path}`, {
        method: init.method,
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch {
      // The auth server is a separate container; if it is down, say so plainly rather than
      // surfacing a raw fetch error as a 500 with no clue which service failed.
      this.logger.error(`auth server unreachable at ${this.baseUrl}`);
      throw new ServiceUnavailableException("The authentication server is unreachable");
    }

    if (!res.ok) {
      // GoTrue's body can carry the submitted password on some validation errors, so only
      // the status and its own message are surfaced — never the request we sent.
      const detail = await res.text().catch(() => "");
      const message = extractMessage(detail) ?? `auth server returned ${res.status}`;
      throw new GoTrueError(res.status, message);
    }

    return (await res.json()) as T;
  }

  /** Create an account with a password already set. Requires `MAILER_AUTOCONFIRM` on GoTrue. */
  async createUser(email: string, password: string): Promise<GoTrueUser> {
    return this.call<GoTrueUser>("/admin/users", {
      method: "POST",
      body: {
        email,
        password,
        // No SMTP exists on the internal deployment, so a confirmation email could never
        // arrive and the account would be permanently unusable. The administrator creating
        // the account IS the verification.
        email_confirm: true,
      },
    });
  }

  /** Find an account by email. Used to adopt one left behind by a partial invite. */
  async findByEmail(email: string): Promise<GoTrueUser | null> {
    const encoded = encodeURIComponent(`"${email}"`);
    const page = await this.call<{ users?: GoTrueUser[] }>(
      `/admin/users?filter=${encoded}&per_page=1`,
      { method: "GET" },
    );
    const found = page.users?.find((u) => u.email?.toLowerCase() === email);
    return found ?? null;
  }

  async setPassword(authUid: string, password: string): Promise<void> {
    await this.call(`/admin/users/${authUid}`, {
      method: "PUT",
      body: { password },
    });
  }

  /**
   * Compensating delete for an account created moments ago whose allowlist row then failed.
   *
   * This does NOT contradict "nothing is ever deleted" (FR-9/FR-35) — that invariant protects
   * tickets and audit history. Leaving an orphaned credential that can authenticate but is
   * attached to no authorized user is a worse outcome than removing it.
   */
  async deleteUser(authUid: string): Promise<void> {
    await this.call(`/admin/users/${authUid}`, { method: "DELETE" });
  }

  /**
   * Verifies a password by attempting a real sign-in. GoTrue has no "is this password
   * correct?" endpoint, so the password grant is the check.
   *
   * The service-role key appears here only as the `apikey` that admits the request to the
   * endpoint — it does NOT bypass the check. `grant_type=password` validates the credential
   * itself, so a wrong password still fails and `res.ok` is a truthful answer.
   *
   * Used to require the CURRENT password before a self-service change.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: this.serviceRoleKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return res.ok;
    } catch {
      throw new ServiceUnavailableException("The authentication server is unreachable");
    }
  }
}

/** A non-2xx from GoTrue, carrying its status so callers can map 4xx to a useful response. */
export class GoTrueError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoTrueError";
  }
}

function extractMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { msg?: string; message?: string; error?: string };
    return parsed.msg ?? parsed.message ?? parsed.error ?? null;
  } catch {
    return null;
  }
}
