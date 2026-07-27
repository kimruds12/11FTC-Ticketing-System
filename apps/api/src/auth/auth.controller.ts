import { Controller, Get } from "@nestjs/common";
import type { AuthContext, MeResponse } from "@11ftc/shared";
import { CurrentUser } from "./current-user.decorator.js";

/**
 * M1 — the only auth HTTP route. `GET /api/v1/me` returns the caller's verified identity,
 * which the web app uses to seed its client-side auth state (cosmetic RBAC). Guarded by the
 * global AuthGuard — an unauthenticated call never reaches the handler.
 */
@Controller({ path: "me", version: "1" })
export class AuthController {
  @Get()
  me(@CurrentUser() user: AuthContext): MeResponse {
    return user;
  }
}
