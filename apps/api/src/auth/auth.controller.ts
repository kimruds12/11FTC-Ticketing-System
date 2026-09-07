import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import {
  changePasswordSchema,
  type AuthContext,
  type ChangePasswordDto,
  type MeResponse,
} from "@11ftc/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { UsersService } from "../master-data/users.service.js";
import { CurrentUser } from "./current-user.decorator.js";

/**
 * M1 — the caller's own identity and credentials. `GET /api/v1/me` returns the verified
 * identity the web app uses to seed its cosmetic RBAC state. Guarded by the global AuthGuard;
 * an unauthenticated call never reaches a handler.
 *
 * **No `@Roles` here, deliberately.** Changing your own password is not an administrative
 * action — every signed-in user must be able to do it, which is exactly why it lives on `/me`
 * and not on the admin-only `/users` controller. The account acted on is taken from the
 * verified session (`@CurrentUser`), never from the request body, so a caller cannot name
 * someone else's account.
 */
@Controller({ path: "me", version: "1" })
export class AuthController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthContext): MeResponse {
    return user;
  }

  /**
   * Self-service password change (ADR-0018). Requires the CURRENT password, verified against
   * the auth server — otherwise an unlocked, unattended browser is enough to take the account
   * over silently.
   *
   * 204: there is nothing to return, and echoing any part of a password back is a habit worth
   * not forming.
   */
  @Post("password")
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ): Promise<void> {
    await this.users.changePassword(user, dto);
  }
}
