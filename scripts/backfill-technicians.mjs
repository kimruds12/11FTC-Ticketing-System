#!/usr/bin/env node
/**
 * One-shot data migration for ADR-0017: `tickets.assigned_to` (FK) + `tickets.assigned_label`
 * (free text) → the `technicians` directory + the `ticket_assignees` join table.
 *
 * Run AFTER migration 0004 (creates the tables) and BEFORE 0005 (drops the old columns).
 *
 *   node scripts/backfill-technicians.mjs            # dry run — reports, writes nothing
 *   node scripts/backfill-technicians.mjs --commit   # writes
 *
 * It is idempotent (every write is ON CONFLICT DO NOTHING), so a re-run after fixing a name
 * is safe. It NEVER deletes a ticket or an audit row — it only adds join rows.
 *
 * The two name sources:
 *   - `assigned_label` — the sheet's own string. Split on "/" because two-technician work is
 *     21% of the history ("Kim/Paul"). "IT Team" has no separator and stays one technician:
 *     it is the team's own shorthand for "whoever was around", and expanding it would be
 *     inventing attribution that was never recorded.
 *   - `assigned_to` — an account FK, used where the importer matched a name to a real user.
 *     We take the account's FIRST NAME, because that is what the sheet's column G says
 *     ("Kim", not "Kim Ruds Guston"). Getting this wrong would silently rewrite column G for
 *     73 tickets the next time they sync.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M4 invariant 1: ONE normalize function. Importing the built shared package rather than
// re-implementing it — a local copy that drifts would create the duplicates it prevents.
const { normalizeName } = await import(
  new URL("packages/shared/dist/normalize.js", `file:///${root.replace(/\\/g, "/")}/`).href
).catch(() => {
  console.error("✗ packages/shared is not built. Run: pnpm --filter @11ftc/shared build");
  process.exit(1);
});

// pnpm's strict node_modules doesn't hoist `pg` to the root — resolve it from apps/api,
// which depends on it directly.
const pg = require(require.resolve("pg", { paths: [join(root, "apps", "api")] }));

const COMMIT = process.argv.includes("--commit");

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
  await client.query("BEGIN");

  /* ---------------------------------------------------------------- read ---- */

  const { rows: tickets } = await client.query(
    `select t.ticket_id, t.ticket_no, t.assigned_to, t.assigned_label, u.full_name
       from tickets t
       left join users u on u.user_id = t.assigned_to
      order by t.ticket_no`,
  );

  /** ticket_id -> ordered display names, exactly as column G should read. */
  const perTicket = new Map();
  /** normalized -> { name, userIds:Set } */
  const techs = new Map();

  for (const t of tickets) {
    let names = [];
    if (t.assigned_label) {
      names = t.assigned_label
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (t.full_name) {
      // First name only — the sheet's short form. See the header note.
      names = [t.full_name.trim().split(/\s+/)[0]];
    }
    if (names.length === 0) continue;

    perTicket.set(t.ticket_id, names);
    for (const name of names) {
      const key = normalizeName(name);
      const entry = techs.get(key) ?? { name, userIds: new Set() };
      if (t.assigned_to && !t.assigned_label) entry.userIds.add(t.assigned_to);
      techs.set(key, entry);
    }
  }

  /* ------------------------------------------------------------- report ---- */

  console.log(`\ntickets scanned            : ${tickets.length}`);
  console.log(`tickets with an assignee   : ${perTicket.size}`);
  console.log(`tickets left unassigned    : ${tickets.length - perTicket.size}`);

  const counts = new Map();
  for (const names of perTicket.values()) {
    for (const n of names) {
      const k = normalizeName(n);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  console.log(`\ntechnicians derived        : ${techs.size}`);
  console.table(
    [...techs.entries()]
      .map(([key, v]) => ({
        technician: v.name,
        tickets: counts.get(key) ?? 0,
        linkedAccount: v.userIds.size === 1 ? "yes" : v.userIds.size > 1 ? "AMBIGUOUS" : "—",
      }))
      .sort((a, b) => b.tickets - a.tickets),
  );

  const ambiguous = [...techs.values()].filter((v) => v.userIds.size > 1);
  if (ambiguous.length) {
    throw new Error(
      `${ambiguous.length} technician name(s) map to more than one account — resolve by hand first`,
    );
  }

  /* -------------------------------------------------------------- write ---- */

  const idByKey = new Map();
  for (const [key, v] of techs) {
    const userId = v.userIds.size === 1 ? [...v.userIds][0] : null;
    const { rows } = await client.query(
      `insert into technicians (name, name_normalized, user_id, is_active)
       values ($1, $2, $3, true)
       on conflict (name_normalized) do update set updated_at = now()
       returning technician_id`,
      [v.name, key, userId],
    );
    idByKey.set(key, rows[0].technician_id);
  }

  let links = 0;
  for (const [ticketId, names] of perTicket) {
    for (const [position, name] of names.entries()) {
      const r = await client.query(
        `insert into ticket_assignees (ticket_id, technician_id, position)
         values ($1, $2, $3) on conflict do nothing`,
        [ticketId, idByKey.get(normalizeName(name)), position],
      );
      links += r.rowCount;
    }
  }

  /* ------------------------------------------------------------- verify ---- */
  // The real test: rebuilding column G from the join table must reproduce the sheet string
  // for every ticket. A mismatch means the next sync would silently rewrite the sheet.

  const { rows: rebuilt } = await client.query(
    `select t.ticket_no,
            coalesce(t.assigned_label, split_part(u.full_name, ' ', 1)) as expected,
            string_agg(tc.name, '/' order by ta.position)               as actual
       from tickets t
       left join users u            on u.user_id = t.assigned_to
       left join ticket_assignees ta on ta.ticket_id = t.ticket_id
       left join technicians tc      on tc.technician_id = ta.technician_id
      group by t.ticket_no, t.assigned_label, u.full_name`,
  );
  const mismatches = rebuilt.filter((r) => (r.expected ?? null) !== (r.actual ?? null));

  console.log(`\njoin rows inserted         : ${links}`);
  console.log(`column-G round-trip check  : ${rebuilt.length - mismatches.length}/${rebuilt.length} match`);
  if (mismatches.length) {
    console.table(mismatches.slice(0, 20));
    throw new Error(`${mismatches.length} ticket(s) would not round-trip to the sheet`);
  }

  if (COMMIT) {
    await client.query("COMMIT");
    console.log("\n✓ COMMITTED");
  } else {
    await client.query("ROLLBACK");
    console.log("\n• DRY RUN — rolled back. Re-run with --commit to keep it.");
  }
} catch (e) {
  await client.query("ROLLBACK");
  console.error(`\n✗ ROLLED BACK — ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
