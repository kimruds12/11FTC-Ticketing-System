import "reflect-metadata";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { TicketStatus } from "@11ftc/shared";
import { ImportModule } from "./import/import.module.js";
import { SheetImportService, type ImportReport } from "./import/sheet-import.service.js";
import { readSheet } from "./import/xlsx-reader.js";

/**
 * M10 — one-time legacy import CLI (ADR-0015). Third entrypoint alongside main.ts and
 * main.worker.ts; same codebase, no HTTP server, run by hand before go-live.
 *
 *   pnpm import:sheet -- --file "docs/.../11FTC- IT Tickets.xlsx"            # dry run
 *   pnpm import:sheet -- --file "..." --commit                                # for real
 *
 * DRY RUN IS THE DEFAULT. Nothing is ever deleted (FR-9/35), so a bad import is permanent —
 * run the first --commit against a database copy, not production.
 */
interface Args {
  file?: string;
  sheet: string;
  commit: boolean;
  actor?: string;
  blankStatus: TicketStatus;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    sheet: "Tickets",
    commit: false,
    blankStatus: TicketStatus.CLOSED,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--file") args.file = next();
    else if (a === "--sheet") args.sheet = next() ?? "Tickets";
    else if (a === "--actor") args.actor = next();
    else if (a === "--commit") args.commit = true;
    else if (a === "--dry-run") args.commit = false;
    else if (a === "--blank-status") {
      const v = next();
      const match = Object.values(TicketStatus).find((s) => s.toLowerCase() === v?.toLowerCase());
      if (!match) throw new Error(`--blank-status must be Open, Ongoing or Closed (got ${v})`);
      args.blankStatus = match;
    }
  }
  return args;
}

function printReport(r: ImportReport, sheet: string): void {
  const line = "─".repeat(66);
  console.log(`\n${line}`);
  console.log(r.committed ? "  IMPORT COMMITTED" : "  DRY RUN — rolled back, nothing was written");
  console.log(line);
  console.log(`  sheet                 ${sheet}`);
  console.log(`  rows read             ${r.totalRows}`);
  console.log(`  tickets imported      ${r.imported}`);
  console.log(`  skipped (existing)    ${r.skippedExisting}`);
  console.log(`  employees created     ${r.employeesCreated}`);
  console.log(`  departments created   ${r.departmentsCreated.length}`);
  console.log(`  main issues created   ${r.mainIssuesCreated.length}`);
  console.log(`  technicians created   ${r.techniciansCreated.length}`);
  console.log(`  multi-technician rows ${r.multiAssigneeRows}  (e.g. "Kim/Paul")`);

  if (Object.keys(r.sequenceSeeded).length) {
    const seeded = Object.entries(r.sequenceSeeded)
      .map(([k, v]) => `${k}→${v}`)
      .join(", ");
    console.log(`  ticket_sequence       ${seeded}   (next encode continues from here)`);
  }

  if (r.departmentsCreated.length) {
    console.log(`\n  Departments created (confirm these are the real list — OPEN-4):`);
    for (const d of r.departmentsCreated.sort()) console.log(`     • ${d}`);
  }
  if (r.mainIssuesCreated.length) {
    console.log(`\n  Main-issue categories created:`);
    for (const m of r.mainIssuesCreated.sort()) console.log(`     • ${m}`);
  }
  if (r.disambiguatedEmployees.length) {
    console.log(
      `\n  Employees disambiguated (same first name, different departments — different people):`,
    );
    for (const e of r.disambiguatedEmployees.sort()) console.log(`     • ${e}`);
  }
  if (r.techniciansCreated.length) {
    // No warning here any more: a technician does NOT need an account to be counted by
    // FR-19 (ADR-0017). This is just so the operator can spot a typo'd name.
    console.log(`\n  Technicians created (confirm these are real people, not typos):`);
    for (const t of r.techniciansCreated.sort()) console.log(`     • ${t}`);
  }
  if (r.problems.length) {
    console.log(`\n  ⚠ Rows needing attention (${r.problems.length}) — fix in the sheet and re-export:`);
    for (const p of r.problems) console.log(`     • ${p}`);
  }

  console.log(`\n${line}`);
  if (!r.committed) {
    console.log("  Re-run with --commit to write. Point at a database COPY first.");
    console.log(line);
  }
  console.log();
}

async function bootstrap(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error(
      'usage: pnpm import:sheet -- --file "<path to .xlsx>" [--sheet Tickets] [--actor <email>] [--commit]',
    );
    process.exitCode = 1;
    return;
  }

  // `nest start` runs with cwd = apps/api, so a repo-relative path like
  // "docs/…/file.xlsx" would not resolve. Try cwd first, then the repo root.
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const candidates = isAbsolute(args.file)
    ? [args.file]
    : [resolve(process.cwd(), args.file), resolve(repoRoot, args.file)];
  const filePath = candidates.find((p) => existsSync(p));
  if (!filePath) {
    console.error(`file not found. Tried:\n${candidates.map((c) => `  ${c}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }

  const rows = readSheet(filePath, args.sheet);

  const app = await NestFactory.createApplicationContext(ImportModule, {
    logger: ["error", "warn", "log"],
  });
  try {
    const service = app.get(SheetImportService);
    const report = await service.run(rows, {
      dryRun: !args.commit,
      actorEmail: args.actor,
      blankStatus: args.blankStatus,
      // A data-entry artefact fills the assignee column of the 55 oldest rows; the IT team
      // confirmed those tickets were Patrick's.
      //
      // BOTH values are mapped because THE CELL VALUE CHANGED between exports: it read "19"
      // when the import was written and "29" in the 2026-08-04 export, across all 55 rows.
      // Whatever produces it in the sheet is not a literal, so a future export may well show
      // a third number. The importer now REPORTS any unaliased numeric assignee rather than
      // silently creating a technician named after it.
      assigneeAliases: { "19": "Patrick", "29": "Patrick" },
    });
    printReport(report, args.sheet);
  } finally {
    await app.close();
  }
}

void bootstrap().catch((err: unknown) => {
  console.error(`\nimport failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
