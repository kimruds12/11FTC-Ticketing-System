import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { CURRENT_API_VERSION, MODULE_VERSIONS } from "./common/versioning/index.js";

/**
 * Version-neutral operational endpoints. `VERSION_NEUTRAL` means these respond WITHOUT a
 * version segment (so `/api/health`, not `/api/v1/health`) — health checks and version
 * discovery must not move when the API version does.
 */
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  /** Liveness probe. Cheap, dependency-free — for load balancers and uptime checks. */
  @Get("health")
  health() {
    return { status: "ok", uptime: Math.round(process.uptime()) };
  }

  /**
   * Version discovery: the current default API version plus every module's deployed
   * semantic version. Lets ops confirm exactly which module build is live (traceability).
   */
  @Get("version")
  version() {
    return {
      api: CURRENT_API_VERSION,
      service: "@11ftc/api",
      modules: MODULE_VERSIONS,
    };
  }
}
