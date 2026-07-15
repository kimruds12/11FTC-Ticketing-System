import { defineConfig } from "vitest/config";

// Unit/integration tests. The concurrency test is a SEPARATE config so it can be run and
// gated on its own in CI — see vitest.concurrency.config.ts.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: ["src/**/*.concurrency.spec.ts"],
  },
});
