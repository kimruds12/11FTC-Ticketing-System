import { defineConfig } from "drizzle-kit";

// Migrations are generated from the schema in src/schema. Connection uses the Supabase
// SESSION pooler (5432) — see .env.example. No seed data lives here: departments and
// main-issue categories are OPEN-4 and come from the IT team, never invented.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
