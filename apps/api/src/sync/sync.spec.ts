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
  const sheets = { upsert: vi.fn() };
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
  it("writes the ticket and records the row it landed on", async () => {
    const { sheets, outbox, svc } = mocks();
    sheets.upsert.mockResolvedValue(3);

    const ok = await svc.processRow(outboxRow());

    expect(ok).toBe(true);
    expect(sheets.upsert).toHaveBeenCalledTimes(1);
    expect(outbox.markSent).toHaveBeenCalledWith("ob-1", 3);
  });

  it("IGNORES raw_row_number — rows shift when a newer ticket is inserted above", async () => {
    // The stored index is a breadcrumb, never an instruction: acting on it would write to
    // whichever ticket has since shifted into that position.
    const { sheets, svc } = mocks();
    sheets.upsert.mockResolvedValue(4);

    await svc.processRow(outboxRow({ rawRowNumber: 42 }));

    // Located afresh by ticket_no; the stale 42 never reaches the sheet.
    expect(sheets.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ticketNo: "IT-2099-0001" }),
    );
    expect(sheets.upsert).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — a retry re-runs the same upsert, never a duplicate (FR-30)", async () => {
    const { sheets, outbox, svc } = mocks();
    sheets.upsert.mockResolvedValue(3);

    await svc.processRow(outboxRow());
    await svc.processRow(outboxRow({ rawRowNumber: 3 }));

    // Same ticket, same landing row both times — the sheet gains no second copy.
    expect(outbox.markSent).toHaveBeenNthCalledWith(1, "ob-1", 3);
    expect(outbox.markSent).toHaveBeenNthCalledWith(2, "ob-1", 3);
  });

  it("a Sheets failure marks the row failed and NEVER throws (isolation, FR-29)", async () => {
    const { sheets, outbox, svc } = mocks();
    sheets.upsert.mockRejectedValue(new Error("google down"));

    await expect(svc.processRow(outboxRow())).resolves.toBe(false);

    expect(outbox.markFailed).toHaveBeenCalledWith("ob-1", 1, "google down");
    expect(outbox.markSent).not.toHaveBeenCalled();
  });
});
