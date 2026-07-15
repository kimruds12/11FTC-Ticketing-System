import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Slim, self-contained server bundle for the Docker runtime image.
  output: "standalone",
  // In a monorepo, trace files from the repo root so standalone bundles workspace deps.
  outputFileTracingRoot: monorepoRoot,
  // @11ftc/shared is a source-only workspace package; let Next transpile it.
  transpilePackages: ["@11ftc/shared"],
};

export default nextConfig;
