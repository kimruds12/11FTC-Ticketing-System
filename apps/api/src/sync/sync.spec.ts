import { describe, it, expect, vi } from "vitest";
import { SyncService } from "./sync.service.js";
import type { OutboxRepository, OutboxRow } from "./outbox.repository.js";
import type { SheetsClient } from "./sheets.client.js";

/**
 * M8 gating tests for the drain LOGIC (mocked Sheets + outbox — no Redis, no real sheet).
 * Idempotency, row-identity, and isolation are the failure modes that corrupt the wrong row
 * or block encoding; they're proven here. The 429/backfill paths need a real sheet.
 */
function outboxRow(over: Partial<OutboxRow> = {}): OutboxRow {
  return {
    outboxId: "ob-1",
    ticketId: "t-1",
    operation: "UPSERT",
    rowKey: "IT-2099-0001",
    payload: { ticketNo: "IT-2099-0001", status: "Closed" },
    status: "PENDING",
    attempts: 0,
    rawRowNumber: null,
    lastError: null,
    createdAt: new Date(),
    sentAt: null,
    ...over,
  };
}

function mocks() {
  const sheets = {
    locateByRowKey: vi.fn(),
    appendRow: vi.fn(),
    updateRow: vi.fn(),
  };
  const outbox = {
    claimPending: vi.fn(),
    markSent: vi.fn(),
    markFailed: vi.fn(),
  };
  const svc = new SyncService(
    outbox as unknown as OutboxRepository,
    sheets as unknown as SheetsClient,
  );
  return { sheets, outbox, svc };
}

describe("SyncService.processRow", () => {
  it("appends a NEW row when row_key isn't found, and caches the index", async () => {
    const { sheets, outbox, svc } = mocks();
    sheets.locateByRowKey.mockResolvedValue(null);
    sheets.appendRow.mockResolvedValue(7);

    const ok = await svc.processRow(outboxRow());

    expect(ok).toBe(true);
    expect(sheets.appendRow).toHaveBeenCalledTimes(1);
    expect(sheets.updateRow).not.toHaveBeenCalled();
    expect(outbox.markSent).toHaveBeenCalledWith("ob-1", 7);
  });

  it("UPDATES the existing row when row_key is found — never a duplicate (FR-30)", async () => {
    const { sheets, outbox, svc } = mocks();
    sheets.locateByRowKey.mockResolvedValue(3);

    await svc.processRow(outboxRow());

    expect(sheets.updateRow).toHaveBeenCalledWith(3, expect.anything());
    expect(sheets.appendRow).not.toHaveBeenCalled();
    expect(outbox.markSent).toHaveBeenCalledWith("ob-1", 3);
  });

  it("uses raw_row_number cache without rescanning (retry path)", async () => {
    const { sheets, svc } = mocks();

    await svc.processRow(outboxRow({ rawRowNumber: 42 }));

    expect(sheets.locateByRowKey).not.toHaveBeenCalled();
    expect(sheets.updateRow).toHaveBeenCalledWith(42, expect.anything());
  });

  it("a Sheets failure marks the row failed and NEVER throws (isolation, FR-29)", async () => {
    const { sheets, outbox, svc } = mocks();
    sheets.locateByRowKey.mockRejectedValue(new Error("google down"));

    await expect(svc.processRow(outboxRow())).resolves.toBe(false);

    expect(outbox.markFailed).toHaveBeenCalledWith("ob-1", 1, "google down");
    expect(outbox.markSent).not.toHaveBeenCalled();
  });
});
