import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  inviteUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  UserRole,
  type InviteUserDto,
  type InvitedUserDto,
  type ResetPasswordDto,
  type UpdateUserDto,
  type UserDto,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { UsersService } from "./users.service.js";

/**
 * M2 — System User provisioning. Admin-only (the whole controller): only an
 * IT_ADMINISTRATOR manages the allowlist and the accounts attached to it.
 *
 * Inviting now creates the auth account too (ADR-0018) and returns its initial password ONCE.
 * `POST :id/reset-password` replaces "forgot password?", which needs email the internal
 * deployment has no server for. Changing your OWN password is not here — it belongs to every
 * user, so it lives on `/me` (auth.controller).
 */
@Roles(UserRole.IT_ADMINISTRATOR)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(): Promise<UserDto[]> {
    return this.users.list();
  }

  /** Creates the allowlist row AND the account. Response carries the password once. */
  @Post("invite")
  invite(
    @Body(new ZodValidationPipe(inviteUserSchema)) dto: InviteUserDto,
  ): Promise<InvitedUserDto> {
    return this.users.invite(dto);
  }

  /** Admin reset. Also provisions an account for a row invited before ADR-0018. */
  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
  ): Promise<InvitedUserDto> {
    return this.users.resetPassword(id, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.users.update(id, dto);
  }
}
