import { describe, it, expect } from "vitest";
import {
  assignTicketSchema,
  encodeTicketSchema,
  formatAssignees,
  TicketStatus,
} from "@11ftc/shared";

/**
 * Gating tests for the ONE assignment field (ADR-0017).
 *
 * The failure these prevent is silent and expensive: the sheet's column G is written from
 * this list, so if the rendering or ordering drifts, the next sync rewrites 280 historical
 * rows with subtly different text and nothing reports an error.
 */
const base = {
  date: "2026-08-03",
  employeeName: "Juan Dela Cruz",
  departmentId: "11111111-1111-4111-8111-111111111111",
  mainIssueId: "22222222-2222-4222-8222-222222222222",
  concern: "Printer jams",
};

describe("formatAssignees — the sheet's column G", () => {
  it("joins with '/' in the given order, matching what the team already writes", () => {
    expect(
      formatAssignees([
        { technicianId: "a", name: "Kim" },
        { technicianId: "b", name: "Paul" },
      ]),
    ).toBe("Kim/Paul");
  });

  it("preserves order — 'Kim/Paul' and 'Paul/Kim' are different cells", () => {
    const kimFirst = formatAssignees([
      { technicianId: "a", name: "Kim" },
      { technicianId: "b", name: "Paul" },
    ]);
    const paulFirst = formatAssignees([
      { technicianId: "b", name: "Paul" },
      { technicianId: "a", name: "Kim" },
    ]);
    expect(kimFirst).not.toBe(paulFirst);
  });

  it("is null (not an empty string) when nobody is assigned", () => {
    // The sheet writer distinguishes "no value" from "", and so does the audit diff.
    expect(formatAssignees([])).toBeNull();
  });

  it("renders a single technician with no separator", () => {
    expect(formatAssignees([{ technicianId: "a", name: "Patrick" }])).toBe("Patrick");
  });

  it("keeps a team label whole — 'IT Team' is one technician, not two", () => {
    expect(formatAssignees([{ technicianId: "t", name: "IT Team" }])).toBe("IT Team");
  });
});

describe("encodeTicketSchema.assignees", () => {
  it("defaults to an empty list — a ticket need not name anyone", () => {
    const parsed = encodeTicketSchema.parse(base);
    expect(parsed.assignees).toEqual([]);
    expect(parsed.status).toBe(TicketStatus.CLOSED); // work happens before the ticket
  });

  it("accepts several names and keeps the typed order", () => {
    const parsed = encodeTicketSchema.parse({ ...base, assignees: ["Kim", "Paul"] });
    expect(parsed.assignees).toEqual(["Kim", "Paul"]);
  });

  it("de-duplicates case- and whitespace-insensitively", () => {
    // Otherwise "Kim" typed twice becomes two join rows and FR-19 double-counts them.
    const parsed = encodeTicketSchema.parse({
      ...base,
      assignees: ["Kim", "  kim ", "Paul"],
    });
    expect(parsed.assignees).toEqual(["Kim", "Paul"]);
  });

  it("rejects more than five — a typo pasted into the field shouldn't create 40 people", () => {
    const result = encodeTicketSchema.safeParse({
      ...base,
      assignees: ["a", "b", "c", "d", "e", "f"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank name rather than creating an empty technician", () => {
    expect(encodeTicketSchema.safeParse({ ...base, assignees: ["   "] }).success).toBe(false);
  });
});

describe("assignTicketSchema", () => {
  it("an empty list is valid and means 'unassigned'", () => {
    // Re-assignment sends the FULL list, so clearing it is how you unassign.
    expect(assignTicketSchema.parse({ assignees: [] }).assignees).toEqual([]);
  });

  it("accepts names, not ids — a technician typed for the first time has no id yet", () => {
    expect(assignTicketSchema.parse({ assignees: ["Patrick"] }).assignees).toEqual(["Patrick"]);
  });
});
