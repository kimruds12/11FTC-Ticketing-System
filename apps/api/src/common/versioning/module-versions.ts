/**
 * Per-module version registry (M1..M9). Two independent axes per module:
 *
 *  - `api`    — the URI API version its controllers expose (the NestJS `@Controller`
 *               version). Global default is `DEFAULT_API_VERSION` ('1'); bumping ONE module
 *               here + on its controller moves only that module, never the others.
 *  - `semver` — the module's semantic version, bumped on any change to its contract or
 *               behaviour. Surfaced at `GET /api/version` for traceability + observability
 *               (which module version is actually deployed).
 *
 * Modules with no public HTTP surface (M3 numbering, M7 outbox, M8 sync worker) still carry
 * a `semver` for deployment tracking; their `api` mirrors the default but is unused.
 *
 * When you change a module: bump its `semver` in the same PR (see docs/api/versioning.md).
 */
export interface ModuleVersion {
  readonly name: string;
  readonly api: string;
  readonly semver: string;
}

export const MODULE_VERSIONS = {
  M1: { name: "auth", api: "1", semver: "1.0.0" },
  M2: { name: "master-data", api: "1", semver: "1.0.0" },
  M3: { name: "numbering", api: "1", semver: "1.0.0" },
  M4: { name: "employee", api: "1", semver: "1.0.0" },
  M5: { name: "ticket", api: "1", semver: "1.0.0" },
  M6: { name: "audit", api: "1", semver: "1.0.0" },
  M7: { name: "outbox", api: "1", semver: "1.0.0" },
  M8: { name: "sync-worker", api: "1", semver: "1.0.0" },
  M9: { name: "analytics", api: "1", semver: "1.0.0" },
} as const satisfies Record<string, ModuleVersion>;

export type ModuleId = keyof typeof MODULE_VERSIONS;
