import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Next only auto-loads .env from the app dir, but this monorepo keeps a single root .env.
// Load it into process.env before Next compiles/serves, so NEXT_PUBLIC_* are available for
// both client inlining and server runtime (proxy, RSC). Guarded for older Node / no file.
try {
  process.loadEnvFile?.(join(monorepoRoot, ".env"));
} catch {
  // No root .env (e.g. CI provides real env vars directly) — ignore.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Slim, self-contained server bundle for the Docker runtime image.
  output: "standalone",
  // In a monorepo, trace files from the repo root so standalone bundles workspace deps.
  outputFileTracingRoot: monorepoRoot,
  // @11ftc/shared ships built dist ESM; transpiling it keeps Next's target handling simple.
  transpilePackages: ["@11ftc/shared"],
  /**
   * POLL for file changes instead of relying on filesystem events.
   *
   * Dev runs in Docker with the Windows host tree bind-mounted, and inotify events do not
   * cross that boundary. docker-compose already sets CHOKIDAR_USEPOLLING and
   * WATCHPACK_POLLING, but those are chokidar/webpack variables and this app runs on
   * TURBOPACK (Next 16's default dev bundler), which reads neither. The result was a dev
   * server that served the code it started with: an edit that was definitely on disk — and
   * verifiably present inside the container — never reached the browser, so a fix appeared
   * not to work and the honest conclusion "no change" was wrong.
   *
   * `watchOptions.pollIntervalMs` is the bundler-agnostic switch Next added for exactly this.
   * Costs a little CPU; only applies to `next dev`.
   */
  watchOptions: {
    pollIntervalMs: 500,
  },
};

export default nextConfig;
