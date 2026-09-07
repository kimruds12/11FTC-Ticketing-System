import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthContext, UserRole } from "@11ftc/shared";
import { ROLES_KEY } from "./roles.decorator.js";

/**
 * Global role guard (registered as `APP_GUARD`, AFTER `AuthGuard` so `req.user` exists).
 * Enforces `@Roles(...)` against the §3.3 matrix. A route with no `@Roles` is open to any
 * authenticated user. This is the authorization gate — the UI's role checks are cosmetic.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true; // no restriction declared

    const req = ctx.switchToHttp().getRequest<{ user?: AuthContext }>();
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      throw new ForbiddenException("insufficient role");
    }
    return true;
  }
}
