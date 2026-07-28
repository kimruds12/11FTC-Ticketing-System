import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthContext } from "@11ftc/shared";
import { TokenVerifier } from "./token-verifier.js";
import { AuthService } from "./auth.service.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";

type GuardedRequest = {
  headers: { authorization?: string };
  user?: AuthContext;
};

/**
 * Global authentication guard (registered as `APP_GUARD`) — every route is closed unless
 * marked `@Public()`. Verifies the Supabase JWT locally (M1), resolves the allowlisted
 * `public.users` row (binding `auth_uid` on first login), rejects deactivated users, and
 * attaches the `AuthContext`. It decides *who* the caller is; `RolesGuard` decides *what
 * they may do*.
 *
 * Rejections are logged with a reason code but never the raw token (M1 observability).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly verifier: TokenVerifier,
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<GuardedRequest>();
    const token = this.bearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }

    let identity;
    try {
      identity = await this.verifier.verify(token);
    } catch {
      this.logger.warn("rejected: token verification failed");
      throw new UnauthorizedException("invalid token");
    }

    const user = await this.auth.resolveByIdentity(identity);
    if (!user) {
      this.logger.warn(`rejected: no-user-row for ${identity.sub}`);
      throw new ForbiddenException("not authorized");
    }
    if (!user.isActive) {
      this.logger.warn(`rejected: inactive user ${user.userId}`);
      throw new ForbiddenException("account deactivated");
    }

    req.user = {
      userId: user.userId,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    };
    return true;
  }

  private bearer(header?: string): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(" ");
    return scheme === "Bearer" && value ? value : null;
  }
}
