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
   * DO NOT add `watchOptions: { pollIntervalMs }` here. It breaks routing under Turbopack.
   *
   * The temptation is real: dev runs in Docker with the Windows tree bind-mounted, inotify
   * events do not cross that boundary, and the CHOKIDAR_USEPOLLING / WATCHPACK_POLLING vars
   * in docker-compose do nothing because they belong to chokidar and webpack — this app is
   * on Turbopack, Next 16's default dev bundler, which reads neither. So the dev server
   * keeps serving the code it booted with, and `watchOptions.pollIntervalMs` looks like the
   * documented fix.
   *
   * It is not, here. Turning it on made Turbopack's poller stat build paths that do not
   * exist (`.next-internal/server/app/(app)/tickets/new/page` among them) and log
   * `watch error ... NotFound` for each. Routes named in those errors stopped being
   * registered: `/tickets/new` began returning a hard 404 in dev while `/tickets` was fine
   * and `pnpm build` still emitted the route. Measured, same container, one variable:
   * 19 watch errors with polling, 0 without.
   *
   * The cost of leaving it off is that a code change needs `docker compose restart web` to
   * appear. That is annoying. A dev server that 404s real routes is worse.
   */
};

export default nextConfig;
