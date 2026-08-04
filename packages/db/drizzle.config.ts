import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

// Migrations are generated from the schema in src/schema. Connection uses the Supabase
// SESSION pooler (5432) — see .env.example. No seed data lives here: departments and
// main-issue categories are OPEN-4 and come from the IT team, never invented.

/**
 * Read DATABASE_URL from the REPO-ROOT `.env`.
 *
 * drizzle-kit runs with cwd = packages/db and does not walk up looking for a `.env`, so
 * without this `pnpm db:migrate` fails with a bare `[x] url: ''` — which reads like a
 * malformed connection string rather than "your env file was never loaded". An already-set
 * env var wins, so CI and `docker compose` (which inject it) are unaffected.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const line = readFileSync(resolve(here, "../../.env"), "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("DATABASE_URL="));
    return line ? line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return ""; // no .env — drizzle-kit's own "required params" error is the right message
  }
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl(),
  },
  strict: true,
  verbose: true,
});
