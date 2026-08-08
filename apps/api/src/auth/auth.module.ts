import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { TokenVerifier } from "./token-verifier.js";
import { jwksProvider, tokenVerifierProvider } from "./jwks.provider.js";
import { AuthGuard } from "./auth.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { MasterDataModule } from "../master-data/master-data.module.js";

/**
 * M1 — Auth & RBAC. Verifies Supabase session JWTs locally via jose + createRemoteJWKSet;
 * resolves the allowlisted `public.users` row (binding `auth_uid` on first login); exposes
 * `GET /me` and the §3.3 RBAC guards. See docs/implementation/M1-auth.md.
 *
 * Both guards are registered GLOBALLY (APP_GUARD) so every route is closed by default.
 * Order matters: AuthGuard first (attaches req.user), then RolesGuard (reads it). Public
 * routes opt out with `@Public()`; role-restricted routes declare `@Roles(...)`.
 */
@Module({
  // For `POST /me/password`. MasterDataModule takes the GoTrue client from the leaf
  // GoTrueModule rather than from here, so these two do not import each other.
  imports: [MasterDataModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    jwksProvider,
    tokenVerifierProvider,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, TokenVerifier],
})
export class AuthModule {}
