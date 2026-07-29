import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google, type sheets_v4 } from "googleapis";
import type { SheetRowPayload } from "../outbox/outbox.service.js";

/**
 * The append-only `_raw` tab, column order. **Column B (index 1) is `ticket_no` = row_key** —
 * `locateByRowKey` scans column B. Never rely on a remembered position; `_raw` never shifts,
 * so a cached row index stays valid, but the row_key scan is the authority.
 */
function rowValues(p: SheetRowPayload): (string | null)[] {
  return [
    p.date, // A
    p.ticketNo, // B  ← row_key
    p.status, // C
    p.employeeName, // D
    p.department, // E
    p.mainIssue, // F
    p.concern, // G
    p.assignedToName, // H
    p.remarks, // I
    p.ongoingAt, // J
    p.closedAt, // K
  ];
}

function parseRowNumber(range: string): number {
  // e.g. "_raw!A5:K5" → 5
  const m = range.match(/![A-Z]+(\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * M8 — googleapis wrapper for the append-only `_raw` tab. One-way only (FR-25): appends and
 * updates, never reads ticket data back into the system. Auth via
 * `GOOGLE_APPLICATION_CREDENTIALS` (a service-account key that stays on the backend).
 */
@Injectable()
export class SheetsClient {
  private readonly logger = new Logger(SheetsClient.name);
  private api?: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly rawTab: string;

  constructor(config: ConfigService) {
    this.spreadsheetId = config.get<string>("GOOGLE_SHEETS_SPREADSHEET_ID") ?? "";
    this.rawTab = config.get<string>("GOOGLE_SHEETS_RAW_TAB") ?? "_raw";
  }

  private sheets(): sheets_v4.Sheets {
    if (!this.api) {
      // googleapis' own GoogleAuth — uses GOOGLE_APPLICATION_CREDENTIALS, and its types line
      // up with google.sheets() (avoids the google-auth-library version skew).
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      this.api = google.sheets({ version: "v4", auth });
    }
    return this.api;
  }

  /** Append a NEW row to `_raw`; return its 1-based row number to cache as raw_row_number. */
  async appendRow(payload: SheetRowPayload): Promise<number> {
    const res = await this.sheets().spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rawTab}!A:K`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowValues(payload)] },
    });
    const row = parseRowNumber(res.data.updates?.updatedRange ?? "");
    this.logger.log(`appended ${payload.ticketNo} → _raw row ${row}`);
    return row;
  }

  /** Update the EXISTING row at `rowNumber` (idempotent re-send / status change). */
  async updateRow(rowNumber: number, payload: SheetRowPayload): Promise<void> {
    await this.sheets().spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rawTab}!A${rowNumber}:K${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [rowValues(payload)] },
    });
    this.logger.log(`updated ${payload.ticketNo} → _raw row ${rowNumber}`);
  }

  /** Locate a row by `row_key` (ticket_no) — scan column B. Returns 1-based row or null. */
  async locateByRowKey(rowKey: string): Promise<number | null> {
    const res = await this.sheets().spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rawTab}!B:B`,
    });
    const rows = res.data.values ?? [];
    const idx = rows.findIndex((r) => r[0] === rowKey);
    return idx >= 0 ? idx + 1 : null;
  }
}
