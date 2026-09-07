import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { UserRole } from "@11ftc/shared";
import { AuthGuard } from "./auth.guard.js";
import type { TokenVerifier, VerifiedIdentity } from "./token-verifier.js";
import type { AuthService, UserRow } from "./auth.service.js";

/**
 * Guard-level gating tests (M1 "tests that gate merge"). Verifier + directory are mocked so
 * we assert the HTTP outcomes: 401 for bad/missing tokens, 403 for not-authorized / inactive.
 */
const IDENTITY: VerifiedIdentity = { sub: "auth-uid-1", email: "staff@company.com" };

const activeUser: UserRow = {
  userId: "user-1",
  authUid: "auth-uid-1",
  email: "staff@company.com",
  fullName: "Staff Member",
  role: UserRole.IT_STAFF,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeCtx(authorization?: string): {
  ctx: ExecutionContext;
  req: { headers: { authorization?: string }; user?: unknown };
} {
  const req = { headers: authorization ? { authorization } : {} } as {
    headers: { authorization?: string };
    user?: unknown;
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe("AuthGuard", () => {
  let verifier: { verify: ReturnType<typeof vi.fn> };
  let auth: { resolveByIdentity: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: AuthGuard;

  beforeEach(() => {
    verifier = { verify: vi.fn() };
    auth = { resolveByIdentity: vi.fn() };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) }; // not public
    guard = new AuthGuard(
      verifier as unknown as TokenVerifier,
      auth as unknown as AuthService,
      reflector as unknown as Reflector,
    );
  });

  it("allows a @Public() route with no token", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { ctx } = makeCtx();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("401 when the Authorization header is missing", async () => {
    const { ctx } = makeCtx();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("401 when the token fails verification (expired / tampered)", async () => {
    verifier.verify.mockRejectedValue(new Error("expired"));
    const { ctx } = makeCtx("Bearer bad.token");
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("403 when the verified identity has no allowlist row (no-user-row)", async () => {
    verifier.verify.mockResolvedValue(IDENTITY);
    auth.resolveByIdentity.mockResolvedValue(null);
    const { ctx } = makeCtx("Bearer good.token");
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("403 when the user is deactivated", async () => {
    verifier.verify.mockResolvedValue(IDENTITY);
    auth.resolveByIdentity.mockResolvedValue({ ...activeUser, isActive: false });
    const { ctx } = makeCtx("Bearer good.token");
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an active allowlisted user and attaches AuthContext", async () => {
    verifier.verify.mockResolvedValue(IDENTITY);
    auth.resolveByIdentity.mockResolvedValue(activeUser);
    const { ctx, req } = makeCtx("Bearer good.token");
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      userId: "user-1",
      role: UserRole.IT_STAFF,
      fullName: "Staff Member",
      email: "staff@company.com",
    });
  });
});
