import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import { DATABASE } from "../database/database.constants.js";
import type { VerifiedIdentity } from "./token-verifier.js";

export type UserRow = typeof schema.users.$inferSelect;

/**
 * M1 — resolves the allowlisted `public.users` row for a verified Supabase identity, binding
 * `auth_uid` on first login (ADR-0013). The `public.users` row IS the authorization: a
 * verified identity with no matching row is not authorized (the guard returns 403).
 *
 * Lookup order:
 *   1. by `auth_uid` (fast path once bound),
 *   2. by `email` (the allowlist key) — claim it by writing `auth_uid` on first login.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async resolveByIdentity(identity: VerifiedIdentity): Promise<UserRow | null> {
    // 1. Already bound.
    const byUid = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.authUid, identity.sub))
      .limit(1);
    if (byUid[0]) return byUid[0];

    // 2. First login — match the allowlist row by email and claim it.
    const byEmail = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, identity.email))
      .limit(1);
    const row = byEmail[0];
    if (!row) return null; // not allowlisted → 403 (no-user-row)

    // Email allowlisted but already bound to a DIFFERENT Supabase identity — refuse to
    // rebind (would let a new auth account hijack an existing user). Deny, and log loudly.
    if (row.authUid && row.authUid !== identity.sub) {
      this.logger.warn(
        `auth_uid conflict for ${identity.email}: row bound to a different identity`,
      );
      return null;
    }

    // Bind on first login.
    const bound = await this.db
      .update(schema.users)
      .set({ authUid: identity.sub, updatedAt: sql`now()` })
      .where(eq(schema.users.userId, row.userId))
      .returning();
    this.logger.log(`bound auth_uid for ${identity.email} on first login`);
    return bound[0] ?? row;
  }
}
