#!/usr/bin/env node
/**
 * One-shot repair for a drizzle migration ledger that was never written.
 *
 *   node scripts/baseline-migrations.mjs            # dry run — reports, writes nothing
 *   node scripts/baseline-migrations.mjs --commit   # writes the ledger rows
 *
 * ── The problem this fixes ────────────────────────────────────────────────────────────
 * `drizzle-kit migrate` decides what to run from ONE comparison (drizzle-orm
 * pg-core/dialect.js `migrate`):
 *
 *     select id, hash, created_at from drizzle.__drizzle_migrations
 *       order by created_at desc limit 1
 *     ...
 *     if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis)
 *
 * `drizzle.__drizzle_migrations` on this project is EMPTY even though 0000..0005 are all
 * applied — the early migrations were run by hand and the ledger never got its rows. So
 * `lastDbMigration` is undefined, every migration looks unapplied, and the very first
 * statement of `0000_init.sql` fails with `relation "users" already exists`. The whole run
 * is one transaction, so nothing is applied and `pnpm db:migrate` is simply unusable.
 *
 * ── What baselining means ─────────────────────────────────────────────────────────────
 * Record, without executing anything, that migrations 0000..0005 are already applied. From
 * then on `drizzle-kit migrate` sees `created_at` at the head of the journal and runs only
 * genuinely new files.
 *
 * ── The rule that makes this safe ─────────────────────────────────────────────────────
 * A ledger row is written ONLY for a migration whose effect is PROVEN present in the
 * database (see PROBES). Writing a row for a migration that was never applied is the one
 * unrecoverable mistake here: drizzle would skip that file forever and the schema would be
 * permanently, silently behind. If any probe fails the script aborts and writes nothing.
 *
 * Hashes come from drizzle-orm's own `readMigrationFiles`, not a re-implementation, so they
 * agree with the migrator by construction. (0.45.2 never compares the hash — only
 * `created_at` gates the skip — but the column is the file's identity and a future version
 * may well check it. Storing a hash we invented would be storing a lie.)
 *
 * Idempotent: a row is matched by `created_at` (the journal's `when`, unique per entry), so
 * re-running adds nothing.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = join(root, "packages", "db", "migrations");

const COMMIT = process.argv.includes("--commit");

/**
 * How each migration proves itself. `sql` must return exactly one row with a boolean
 * `applied`. These are deliberately narrow — the artifact each file creates and nothing
 * else — because a vague probe that passes on a half-applied schema is worse than no probe.
 */
const PROBES = {
  "0000_init": {
    what: "core tables exist",
    sql: `select to_regclass('public.tickets') is not null
             and to_regclass('public.users')   is not null as applied`,
  },
  "0001_enable_rls_supabase": {
    what: "RLS enabled on tickets",
    sql: `select coalesce(bool_and(c.relrowsecurity), false) as applied
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname in ('tickets','users','audit_log')`,
  },
  "0002_curvy_hercules": {
    what: "users.auth_uid exists",
    sql: `select count(*) = 1 as applied from information_schema.columns
           where table_schema='public' and table_name='users' and column_name='auth_uid'`,
  },
  "0003_sharp_reavers": {
    what: "tickets.source exists",
    sql: `select count(*) = 1 as applied from information_schema.columns
           where table_schema='public' and table_name='tickets' and column_name='source'`,
  },
  "0004_add_technicians": {
    what: "technicians + ticket_assignees exist",
    sql: `select to_regclass('public.technicians')      is not null
             and to_regclass('public.ticket_assignees') is not null as applied`,
  },
  "0005_drop_ticket_assigned_columns": {
    // Inverted on purpose: this migration's effect is an ABSENCE. Probing for the table
    // would pass before the drop as well and prove nothing.
    what: "tickets.assigned_to is gone",
    sql: `select count(*) = 0 as applied from information_schema.columns
           where table_schema='public' and table_name='tickets'
             and column_name in ('assigned_to','assigned_label')`,
  },
};

/* ------------------------------------------------------------------ read files ---- */

// Resolve from packages/db — pnpm's strict node_modules does not hoist to the root.
const { readMigrationFiles } = await import(
  pathToFileURL(
    require.resolve("drizzle-orm/migrator", { paths: [join(root, "packages", "db")] }),
  ).href
);

const journal = JSON.parse(
  readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
);
const files = readMigrationFiles({ migrationsFolder });

if (files.length !== journal.entries.length) {
  console.error("✗ journal/file count mismatch — refusing to guess");
  process.exit(1);
}

// readMigrationFiles walks journal.entries in order, so index i is entry i.
const planned = journal.entries.map((entry, i) => ({
  tag: entry.tag,
  createdAt: files[i].folderMillis,
  hash: files[i].hash,
}));

/* ------------------------------------------------------------------- connect ---- */

const pg = require(require.resolve("pg", { paths: [join(root, "apps", "api")] }));

const envLine = readFileSync(join(root, ".env"), "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="));
if (!envLine) {
  console.error("✗ DATABASE_URL not found in .env");
  process.exit(1);
}
const url = envLine.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  /* ---------------------------------------------------------------- ledger ---- */

  // Exactly the DDL drizzle-orm issues, so a later `drizzle-kit migrate` finds the table it
  // expects rather than creating a second one.
  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "drizzle";
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );`;
  if (COMMIT) {
    await client.query(ddl);
  } else {
    // Dry run must not create anything, but it still has to read the table. Tolerate its
    // absence — that IS the expected state on a broken ledger.
    const { rows } = await client.query(
      `select to_regclass('drizzle.__drizzle_migrations') is not null as present`,
    );
    if (!rows[0].present) {
      console.log("· drizzle.__drizzle_migrations does not exist yet (will be created)\n");
    }
  }

  const existing = (
    await client
      .query(
        `select hash, created_at from "drizzle"."__drizzle_migrations" order by created_at`,
      )
      .catch(() => ({ rows: [] }))
  ).rows;

  const recorded = new Set(existing.map((r) => String(r.created_at)));

  console.log(`ledger rows found: ${existing.length}`);
  console.log(`journal entries:   ${planned.length}\n`);

  /* ----------------------------------------------------------------- verify ---- */

  const toInsert = [];
  const failures = [];

  for (const m of planned) {
    const already = recorded.has(String(m.createdAt));
    const probe = PROBES[m.tag];
    if (!probe) {
      failures.push(`${m.tag}: no probe defined — add one before baselining`);
      continue;
    }
    const { rows } = await client.query(probe.sql);
    const applied = rows[0]?.applied === true;

    const mark = already ? "=" : applied ? "+" : "✗";
    console.log(
      `  ${mark} ${m.tag.padEnd(36)} ${probe.what.padEnd(34)} ` +
        `${already ? "already recorded" : applied ? "applied → will record" : "NOT APPLIED"}`,
    );

    if (already) continue;
    if (!applied) {
      failures.push(
        `${m.tag}: not applied (${probe.what} is false). Baselining it would make ` +
          `drizzle skip the file forever.`,
      );
      continue;
    }
    toInsert.push(m);
  }

  if (failures.length) {
    console.error("\n✗ aborting — nothing written:");
    for (const f of failures) console.error(`   ${f}`);
    console.error(
      "\n  A migration that is genuinely pending must be RUN, not baselined. Apply its SQL\n" +
        "  first, then re-run this script.",
    );
    process.exit(1);
  }

  /* ----------------------------------------------------------------- write ---- */

  if (!toInsert.length) {
    console.log("\n✓ ledger already complete — nothing to do.");
  } else if (!COMMIT) {
    console.log(
      `\nDRY RUN — would insert ${toInsert.length} row(s). Re-run with --commit to write.`,
    );
  } else {
    // One transaction: a half-written ledger is a worse state than an empty one, because
    // `order by created_at desc limit 1` would then report a head that skips the gap.
    await client.query("BEGIN");
    for (const m of toInsert) {
      await client.query(
        `insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)`,
        [m.hash, m.createdAt],
      );
    }
    await client.query("COMMIT");
    console.log(`\n✓ inserted ${toInsert.length} ledger row(s).`);
  }

  /* ------------------------------------------------------------------ proof ---- */

  const head = (
    await client
      .query(
        `select created_at from "drizzle"."__drizzle_migrations"
          order by created_at desc limit 1`,
      )
      .catch(() => ({ rows: [] }))
  ).rows[0];

  const last = planned[planned.length - 1];
  const settled = head && Number(head.created_at) >= last.createdAt;
  console.log(
    settled
      ? `✓ head is ${last.tag} — \`pnpm db:migrate\` is now a no-op until a new migration lands.`
      : `· after --commit, head will be ${last.tag} and \`pnpm db:migrate\` becomes a no-op.`,
  );
} finally {
  await client.end();
}
