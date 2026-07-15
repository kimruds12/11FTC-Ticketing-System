import { defineConfig } from "vitest/config";

// The M3 concurrency gate, isolated. `pnpm test:concurrency` runs ONLY this. It hits a
// real Postgres (see .env / CI services) because the guarantee it proves — one atomic
// sequence under contention — cannot be tested against a mock.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.concurrency.spec.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
