import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  inviteUserSchema,
  updateUserSchema,
  UserRole,
  type InviteUserDto,
  type UpdateUserDto,
  type UserDto,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { UsersService } from "./users.service.js";

/**
 * M2 — System User provisioning. Admin-only (the whole controller): only an
 * IT_ADMINISTRATOR manages the allowlist. Sign-in itself is Google OAuth (M1); there is no
 * password endpoint here (ADR-0013).
 */
@Roles(UserRole.IT_ADMINISTRATOR)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(): Promise<UserDto[]> {
    return this.users.list();
  }

  @Post("invite")
  invite(
    @Body(new ZodValidationPipe(inviteUserSchema)) dto: InviteUserDto,
  ): Promise<UserDto> {
    return this.users.invite(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.users.update(id, dto);
  }
}
