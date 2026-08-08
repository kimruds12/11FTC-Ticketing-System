#!/usr/bin/env node
/**
 * Create the FIRST IT Administrator — the one account that cannot be created through the UI.
 *
 *   node scripts/seed-admin.mjs --email you@11ftc.local --name "Your Name"            # dry run
 *   node scripts/seed-admin.mjs --email you@11ftc.local --name "Your Name" --commit
 *   node scripts/seed-admin.mjs --email ... --name "..." --password "..." --commit
 *
 * `POST /users/invite` is admin-only, so on an empty database there is nobody who can call
 * it — every path into the app requires an administrator that does not exist yet. This does
 * the same two writes that endpoint does (ADR-0018), from outside the guard:
 *
 *   1. the GoTrue account, with a password;
 *   2. the `public.users` allowlist row, role IT_ADMINISTRATOR, bound by `auth_uid`.
 *
 * Both halves are required. An account with no allowlist row authenticates and is then
 * rejected by `/me`; a row with no account has nothing to sign in with.
 *
 * Run it ONCE per environment, after `pnpm db:migrate`. Afterwards, invite everyone else
 * through the Directory so the normal path gets exercised.
 *
 * Reads DATABASE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the repo-root `.env`,
 * so it targets whichever Supabase the app is currently pointed at — which is why it prints
 * that host and makes you confirm before writing.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------- args ---- */

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const COMMIT = argv.includes("--commit");
const email = arg("email")?.trim().toLowerCase();
const fullName = arg("name")?.trim();
const suppliedPassword = arg("password");

if (!email || !fullName) {
  console.error(
    'usage: node scripts/seed-admin.mjs --email <email> --name "<Full Name>" [--password <pw>] [--commit]',
  );
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(`✗ "${email}" is not a valid email address`);
  process.exit(1);
}

/* -------------------------------------------------------------------- env ---- */

const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const missing = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
  (k) => !env[k],
);
if (missing.length) {
  console.error(`✗ missing from .env: ${missing.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, "");
const dbHost = /@([^/:]+)/.exec(env.DATABASE_URL)?.[1] ?? "(unknown)";

/**
 * Show the TARGET before doing anything. This script creates an administrator; running it
 * against the wrong Supabase — the cloud project instead of the self-hosted one — is a
 * mistake worth making visible rather than discovering afterwards.
 */
console.log(`  auth server : ${supabaseUrl}`);
console.log(`  database    : ${dbHost}`);
console.log(`  email       : ${email}`);
console.log(`  full name   : ${fullName}`);
console.log(`  role        : IT_ADMINISTRATOR\n`);

/* ---------------------------------------------------------------- password ---- */

const { generatePassword } = await import(
  pathToFileURL(join(root, "apps", "api", "dist", "auth", "generate-password.js")).href
).catch(() => {
  console.error("✗ apps/api is not built. Run: pnpm --filter @11ftc/api build");
  process.exit(1);
});

const generated = suppliedPassword ? null : generatePassword();
const password = suppliedPassword ?? generated;

/* ------------------------------------------------------------------ gotrue ---- */

async function gotrue(path, method, body) {
  const res = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    console.error(`✗ cannot reach the auth server at ${supabaseUrl}. Is Supabase running?`);
    process.exit(1);
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`✗ auth server returned ${res.status}: ${detail.slice(0, 300)}`);
    process.exit(1);
  }
  return res.json();
}

/* ---------------------------------------------------------------- database ---- */

const pg = require(require.resolve("pg", { paths: [join(root, "apps", "api")] }));
const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect().catch((e) => {
  console.error(`✗ cannot reach the database at ${dbHost}: ${e.message}`);
  process.exit(1);
});

async function main() {
 try {
  const hasUsers = (
    await client.query(`select to_regclass('public.users') is not null as ok`)
  ).rows[0].ok;
  if (!hasUsers) {
    console.error("✗ public.users does not exist. Run `pnpm db:migrate` first.");
    process.exitCode = 1;
    return;
  }

  const existingRow = (
    await client.query(
      `select user_id, role, auth_uid from public.users where email = $1`,
      [email],
    )
  ).rows[0];

  const existingAuth = (
    await gotrue(`/admin/users?filter=${encodeURIComponent(`"${email}"`)}&per_page=1`, "GET")
  ).users?.find((u) => u.email?.toLowerCase() === email);

  console.log("plan:");
  console.log(
    `  auth account   ${existingAuth ? "exists → set its password" : "create with a password"}`,
  );
  console.log(
    `  allowlist row  ${existingRow ? `exists (role ${existingRow.role}) → promote to IT_ADMINISTRATOR` : "create as IT_ADMINISTRATOR"}`,
  );

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit.");
    // `return`, not `process.exit`: exiting here skips the `finally` that closes the
    // database socket, and libuv then asserts during teardown — noise that hides real errors.
    return;
  }

  const authUid = existingAuth
    ? (await gotrue(`/admin/users/${existingAuth.id}`, "PUT", { password }), existingAuth.id)
    : (await gotrue("/admin/users", "POST", { email, password, email_confirm: true })).id;

  // One statement, so a re-run cannot leave the row half-updated. `is_active` is forced true:
  // seeding an administrator who is deactivated would lock the system with no way back in.
  await client.query(
    `insert into public.users (email, full_name, role, is_active, auth_uid)
     values ($1, $2, 'IT_ADMINISTRATOR', true, $3)
     on conflict (email) do update
       set full_name = excluded.full_name,
           role      = 'IT_ADMINISTRATOR',
           is_active = true,
           auth_uid  = excluded.auth_uid,
           updated_at = now()`,
    [email, fullName, authUid],
  );

  console.log("\n✓ administrator ready.");
  if (generated) {
    console.log("\n  ──────────────────────────────────────────────");
    console.log(`   password:  ${generated}`);
    console.log("  ──────────────────────────────────────────────");
    console.log("   Shown once. It is not stored anywhere and cannot be recovered —");
    console.log("   sign in and change it from Account.\n");
  } else {
    console.log("  (password: the one you supplied)\n");
  }
  } finally {
    await client.end();
  }
}

await main();
