// Next.js 16 removed `next lint` — linting is the ESLint CLI with flat config.
// This config is scoped to apps/web; the repo-root eslint.config.mjs ignores apps/web
// and lints the NestJS/TS packages.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
