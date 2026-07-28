import { jwtVerify, type JWTVerifyGetKey } from "jose";

export interface TokenVerifierOptions {
  /** Expected `iss`, e.g. `https://<project-ref>.supabase.co/auth/v1`. */
  issuer: string;
  /** Expected `aud` — `authenticated` for a signed-in Supabase user. */
  audience: string;
  /** Allowed clock skew in seconds (default 5). */
  clockToleranceSec?: number;
}

/** The minimal, trusted identity extracted from a verified Supabase session JWT. */
export interface VerifiedIdentity {
  /** Supabase auth UID (JWT `sub`) — bound to `public.users.auth_uid` on first login. */
  sub: string;
  /** Verified email — the allowlist key (`public.users.email`), lower-cased. */
  email: string;
}

/** Signature/expiry/claims verification failed. The guard maps this to HTTP 401. */
export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTokenError";
  }
}

/**
 * Verifies Supabase-issued session JWTs locally against the project JWKS (M1). Pure and
 * framework-free so it is unit-testable with a local JWK set (token-verifier.spec.ts); the
 * NestJS wiring (auth.module) injects the remote JWKS + issuer/audience from config.
 *
 * IMPORTANT: the JWT `role` claim is the POSTGRES role (`authenticated`), NOT our app
 * `UserRole`. Authorization comes from `public.users`, never from the token. This class
 * establishes *who* the caller is, not *what they may do*.
 */
export class TokenVerifier {
  private readonly clockTolerance: number;

  constructor(
    private readonly jwks: JWTVerifyGetKey,
    private readonly options: TokenVerifierOptions,
  ) {
    this.clockTolerance = options.clockToleranceSec ?? 5;
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    let payload;
    try {
      // jwtVerify throws on bad signature, expiry, or iss/aud mismatch.
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.options.issuer,
        audience: this.options.audience,
        clockTolerance: this.clockTolerance,
        // Pin to the asymmetric alg — blocks an alg-confusion downgrade (e.g. a forged
        // HS256 token signed with the public key as the HMAC secret). Swap if the project
        // uses legacy HS256 (ADR-0013 watch-out).
        algorithms: ["ES256"],
      }));
    } catch (cause) {
      throw new InvalidTokenError(
        cause instanceof Error ? cause.message : "token verification failed",
      );
    }

    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const rawEmail = typeof payload.email === "string" ? payload.email : undefined;
    if (!sub || !rawEmail) {
      throw new InvalidTokenError("token is missing the required sub/email claims");
    }
    return { sub, email: rawEmail.toLowerCase() };
  }
}
