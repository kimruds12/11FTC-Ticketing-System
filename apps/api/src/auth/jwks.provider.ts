import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import type { Env } from "../config/env.js";
import { TokenVerifier } from "./token-verifier.js";

/** DI token for the remote JWKS key resolver. */
export const JWKS = Symbol("JWKS");

/**
 * The remote JWKS resolver. `createRemoteJWKSet` fetches the project's public keys and
 * caches them; the endpoint is edge-cached ~10 min. We do NOT add a longer in-process
 * cache — key rotation would then silently reject valid users (M1 watch-out).
 */
export const jwksProvider: Provider = {
  provide: JWKS,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): JWTVerifyGetKey =>
    createRemoteJWKSet(new URL(config.get("SUPABASE_JWKS_URL", { infer: true }))),
};

/**
 * `TokenVerifier` wired from config: the remote JWKS + the expected issuer
 * (`<SUPABASE_URL>/auth/v1`) and audience (`authenticated`). Verified locally — no Supabase
 * round trip per request.
 */
export const tokenVerifierProvider: Provider = {
  provide: TokenVerifier,
  inject: [JWKS, ConfigService],
  useFactory: (
    jwks: JWTVerifyGetKey,
    config: ConfigService<Env, true>,
  ): TokenVerifier => {
    const supabaseUrl = config.get("SUPABASE_URL", { infer: true }).replace(/\/$/, "");
    return new TokenVerifier(jwks, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated",
    });
  },
};
