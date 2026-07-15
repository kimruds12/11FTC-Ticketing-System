import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

/**
 * M1 — Auth & RBAC. Verifies Supabase session JWTs locally via jose + createRemoteJWKSet;
 * loads public.users; exposes AuthGuard + RolesGuard (@Roles) for the §3.3 matrix.
 * Scaffold only — see docs/implementation/M1-auth.md.
 */
@Module({
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
