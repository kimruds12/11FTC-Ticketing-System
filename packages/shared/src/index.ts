/**
 * @11ftc/shared — DTOs, Zod schemas, and shared types used by both the API and the web
 * app. Scaffold only: enums and barrel exports are here so the type surface exists;
 * request/response DTOs are added per module (M1..M9) as those modules are built.
 *
 * Keep this package free of runtime dependencies beyond `zod`. No NestJS, no Next.js.
 */

export * from "./enums.js";
export * from "./normalize.js";
export * from "./dto/index.js";
