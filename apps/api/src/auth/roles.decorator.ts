import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@11ftc/shared";

/** Metadata key carrying the roles allowed on a route. */
export const ROLES_KEY = "roles";

/**
 * Restrict a route to one or more roles (the §3.3 matrix). Read by `RolesGuard`. A route
 * with no `@Roles(...)` is open to any authenticated user. Keeping OPEN-2 a one-line change:
 * the analytics route's `@Roles` is the single place IT-Staff dashboard access flips.
 *
 *   @Roles('IT_ADMINISTRATOR')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
