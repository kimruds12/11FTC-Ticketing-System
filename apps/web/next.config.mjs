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
};

export default nextConfig;
