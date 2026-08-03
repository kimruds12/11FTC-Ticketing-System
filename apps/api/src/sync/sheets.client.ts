import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, resolve } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google, type sheets_v4 } from "googleapis";
import type { SheetRowPayload } from "../outbox/outbox.service.js";

/**
 * The team's `Tickets` tab layout, columns A–I. **Column B is `ticket_no` — the row key.**
 *
 * This mirrors the sheet the IT team already maintains, exactly. Do NOT reorder, and do not
 * extend past I: `ongoing_at`/`closed_at` are deliberately omitted so the sync never adds
 * columns the team did not ask for. Postgres remains the system of record for those.
 */
/**
 * `YYYY-MM-DD` → `M/D/YYYY`, the format the team's sheet already uses.
 *
 * Written with `USER_ENTERED`, so Sheets parses this into a REAL date value and the new row
 * inherits column A's existing formatting and sorts alongside the historical rows. Writing the
 * ISO string under `RAW` (what this did before) left a text cell — visually different, and
 * inert to any date sort or filter the team applies.
 *
 * NOTE: this assumes the spreadsheet's locale is US (M/D/Y). That matches the sheet today; if
 * it is ever switched, this is the one line to change.
 */
function sheetDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso; // not a date we recognise — pass through rather than mangle it
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
}

/**
 * Neutralise a leading formula character before a text cell is written with `USER_ENTERED`.
 *
 * `USER_ENTERED` makes Sheets interpret input the way a human typing would — which means a
 * concern of `=IMPORTXML(...)` becomes a LIVE FORMULA in the team's sheet, executed with their
 * credentials. That is the classic spreadsheet-injection vector, and it is reachable here by
 * anyone who can encode a ticket. Prefixing with an apostrophe forces Sheets to treat the value
 * as literal text; the apostrophe itself is not displayed.
 */
function asText(value: string | null): string | null {
  if (value === null || value === "") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function rowValues(p: SheetRowPayload): (string | null)[] {
  return [
    sheetDate(p.date), // A  Date — a real date, M/D/YYYY, matching the team's rows
    p.ticketNo, // B  Ticket No  ← row key (always IT-####-####, never formula-like)
    asText(p.employeeName), // C  Employee
    asText(p.department), // D  Department
    asText(p.mainIssue), // E  Main issue
    asText(p.concern), // F  Concern
    asText(p.assignedToName), // G  Assigned to — may be multi-person ("Kim/Paul")
    p.status, // H  Status — a closed enum
    asText(p.remarks), // I  Remarks
  ];
}

/** A ticket number in column B. Used to find where the data block starts. */
const TICKET_NO = /^IT-\d{4}-\d{4}$/;

/**
 * Resolve `GOOGLE_APPLICATION_CREDENTIALS`. A relative value (the usual
 * `google_application_credentials/<key>.json`) is anchored to the REPO ROOT, not the process
 * cwd — the worker runs with cwd `apps/api`, so ADC's own resolution looks in the wrong place
 * and fails with `ENOENT ... /app/apps/api/google_application_credentials`.
 *
 * At runtime this file is `apps/api/dist/sync/sheets.client.js`, so four levels up is the root.
 */
function resolveKeyFile(configured: string | undefined): string | undefined {
  if (!configured) return undefined;
  if (isAbsolute(configured)) return configured;
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  return resolve(repoRoot, configured);
}

/**
 * M8 — googleapis wrapper writing DIRECTLY into the team's visible `Tickets` tab, newest at
 * the top (ADR-0016, superseding the `_raw` design in ADR-0003).
 *
 * **Row positions are never remembered.** Inserting at the top shifts every row below it, so a
 * stored index is stale the moment the next ticket is encoded — writing to it would silently
 * overwrite ANOTHER ticket's row. Every operation therefore re-locates by `ticket_no` in
 * column B. `sync_outbox.raw_row_number` is retained only as a diagnostic breadcrumb and is
 * never read back.
 *
 * One-way only (FR-25): appends and updates, never reads ticket data back into the system.
 */
@Injectable()
export class SheetsClient {
  private readonly logger = new Logger(SheetsClient.name);
  private api?: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly tab: string;
  private readonly keyFile?: string;
  /** gid of `tab` — required by insertDimension, which takes an id, not a name. */
  private tabIdCache?: number;

  constructor(config: ConfigService) {
    this.spreadsheetId = config.get<string>("GOOGLE_SHEETS_SPREADSHEET_ID")?.trim() ?? "";
    // `||` not `??`: an unset OR blank value must fall back. This is the TAB NAME (used to
    // build ranges like `Tickets!A:I`), never a tab index — a numeric value yields the
    // useless error "Unable to parse range: 0!A:I".
    this.tab =
      config.get<string>("GOOGLE_SHEETS_TAB")?.trim() ||
      config.get<string>("GOOGLE_SHEETS_RAW_TAB")?.trim() ||
      "Tickets";
    this.keyFile = resolveKeyFile(config.get<string>("GOOGLE_APPLICATION_CREDENTIALS"));
  }

  private sheets(): sheets_v4.Sheets {
    if (!this.api) {
      // googleapis' own GoogleAuth — its types line up with google.sheets() (avoids the
      // google-auth-library version skew). `keyFile` is passed explicitly rather than left to
      // ADC, because ADC resolves a relative GOOGLE_APPLICATION_CREDENTIALS against the
      // process cwd — which is apps/api, not the repo root where the key actually lives.
      const auth = new google.auth.GoogleAuth({
        ...(this.keyFile ? { keyFile: this.keyFile } : {}),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      this.api = google.sheets({ version: "v4", auth });
    }
    return this.api;
  }

  private async tabId(): Promise<number> {
    if (this.tabIdCache != null) return this.tabIdCache;
    const meta = await this.sheets().spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const found = meta.data.sheets?.find((s) => s.properties?.title === this.tab);
    const id = found?.properties?.sheetId;
    if (id == null) {
      const names = (meta.data.sheets ?? [])
        .map((s) => s.properties?.title)
        .filter(Boolean)
        .join(", ");
      throw new Error(`tab "${this.tab}" not found. Available: ${names}`);
    }
    this.tabIdCache = id;
    return id;
  }

  /** Column B top-to-bottom, as plain strings (index 0 = row 1). */
  private async columnB(): Promise<string[]> {
    const res = await this.sheets().spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tab}!B:B`,
    });
    return (res.data.values ?? []).map((r) => String(r?.[0] ?? "").trim());
  }

  private async writeRow(rowNumber: number, payload: SheetRowPayload): Promise<void> {
    await this.sheets().spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tab}!A${rowNumber}:I${rowNumber}`,
      // USER_ENTERED so column A becomes a real date rather than a text cell. Every text
      // column is run through `asText` first — see the injection note there.
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues(payload)] },
    });
  }

  /**
   * Write a ticket to the sheet, idempotently (FR-30).
   *
   * Existing ticket → update its row in place, wherever it currently sits.
   * New ticket → insert a blank row directly ABOVE the newest existing ticket and fill it, so
   * the team's newest-first ordering is preserved without them touching anything.
   *
   * Returns the row it wrote to — for logging only; see the class note on stale indices.
   */
  async upsert(payload: SheetRowPayload): Promise<number> {
    const column = await this.columnB(); // the single read this costs us

    const existingIdx = column.findIndex((v) => v === payload.ticketNo);
    if (existingIdx >= 0) {
      const rowNumber = existingIdx + 1;
      await this.writeRow(rowNumber, payload);
      this.logger.log(`updated ${payload.ticketNo} → ${this.tab} row ${rowNumber}`);
      return rowNumber;
    }

    // Insert above the first real ticket row, so headers and any spacer rows are untouched.
    // If the sheet has no tickets yet, fall in after whatever is already there.
    const firstTicketIdx = column.findIndex((v) => TICKET_NO.test(v));
    const insertAt = firstTicketIdx >= 0 ? firstTicketIdx + 1 : column.length + 1;

    await this.sheets().spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: await this.tabId(),
                dimension: "ROWS",
                startIndex: insertAt - 1, // API is 0-based, half-open
                endIndex: insertAt,
              },
              // Inherit formatting from the row BELOW (the existing data block), not from the
              // header/spacer above it.
              inheritFromBefore: false,
            },
          },
        ],
      },
    });

    await this.writeRow(insertAt, payload);
    this.logger.log(`inserted ${payload.ticketNo} at ${this.tab} row ${insertAt} (top)`);
    return insertAt;
  }
}
