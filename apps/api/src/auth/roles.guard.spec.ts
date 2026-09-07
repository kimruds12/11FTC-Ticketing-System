import { describe, it, expect, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { UserRole, type AuthContext } from "@11ftc/shared";
import { RolesGuard } from "./roles.guard.js";

function ctxWith(user: AuthContext | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

const staff: AuthContext = {
  userId: "u1",
  role: UserRole.IT_STAFF,
  fullName: "Staff",
  email: "s@c.com",
};
const admin: AuthContext = { ...staff, role: UserRole.IT_ADMINISTRATOR };

function guardWithRoles(roles: UserRole[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(roles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe("RolesGuard", () => {
  it("allows any authenticated user when no @Roles is declared", () => {
    expect(guardWithRoles(undefined).canActivate(ctxWith(staff))).toBe(true);
  });

  it("allows a user whose role is permitted", () => {
    const guard = guardWithRoles([UserRole.IT_ADMINISTRATOR]);
    expect(guard.canActivate(ctxWith(admin))).toBe(true);
  });

  it("403 when IT_STAFF hits an IT_ADMINISTRATOR-only route", () => {
    const guard = guardWithRoles([UserRole.IT_ADMINISTRATOR]);
    expect(() => guard.canActivate(ctxWith(staff))).toThrow(ForbiddenException);
  });

  it("403 when there is no user on the request", () => {
    const guard = guardWithRoles([UserRole.IT_ADMINISTRATOR]);
    expect(() => guard.canActivate(ctxWith(undefined))).toThrow(ForbiddenException);
  });
});
