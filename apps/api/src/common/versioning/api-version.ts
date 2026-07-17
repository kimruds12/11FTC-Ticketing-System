/**
 * API-wide versioning constants. The HTTP surface is URI-versioned (NestJS
 * VersioningType.URI): every route lives under `/{API_PREFIX}/v{version}` — e.g.
 * `/api/v1/tickets`. See docs/api/versioning.md and ADR-0012.
 *
 * `DEFAULT_API_VERSION` is the version a controller gets when it doesn't declare its own.
 * A single module can opt into a higher version later via `@Controller({ version: '2' })`
 * without forcing the rest of the API to move.
 */
export const API_PREFIX = "api";

/** The default URI version applied to controllers that don't override it. */
export const DEFAULT_API_VERSION = "1";

/** Human/display form of the current default version, e.g. surfaced at `/api/version`. */
export const CURRENT_API_VERSION = `v${DEFAULT_API_VERSION}`;
