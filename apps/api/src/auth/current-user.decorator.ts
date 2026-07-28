import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthContext } from "@11ftc/shared";

/**
 * Injects the verified `AuthContext` that `AuthGuard` attached to the request.
 *
 *   me(@CurrentUser() user: AuthContext) { ... }
 *
 * Only present on guarded (non-`@Public`) routes — the guard runs first and rejects any
 * request that would otherwise reach a handler without one.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthContext }>();
    return req.user;
  },
);
