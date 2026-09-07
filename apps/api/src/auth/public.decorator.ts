import { SetMetadata } from "@nestjs/common";

/** Metadata key marking a route as public (skips the global AuthGuard). */
export const IS_PUBLIC_KEY = "isPublic";

/**
 * Opt a route out of authentication. The global `AuthGuard` closes every route by default;
 * `@Public()` is the explicit exception — only for genuinely open endpoints (health,
 * version). Everything else requires a verified session.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
