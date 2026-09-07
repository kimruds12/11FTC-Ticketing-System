import { describe, it, expect } from "vitest";
import { TicketStatus } from "@11ftc/shared";
import { canTransitionTo } from "./state-machine.js";

describe("ticket state machine (server-side, FR-7/8)", () => {
  it("allows Open → Ongoing and Open → Closed", () => {
    expect(canTransitionTo(TicketStatus.OPEN, TicketStatus.ONGOING)).toBe(true);
    expect(canTransitionTo(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(true);
  });

  it("allows Ongoing → Closed", () => {
    expect(canTransitionTo(TicketStatus.ONGOING, TicketStatus.CLOSED)).toBe(true);
  });

  it("Closed is terminal — no transition out (FR-8)", () => {
    expect(canTransitionTo(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(false);
    expect(canTransitionTo(TicketStatus.CLOSED, TicketStatus.ONGOING)).toBe(false);
    expect(canTransitionTo(TicketStatus.CLOSED, TicketStatus.CLOSED)).toBe(false);
  });

  it("rejects backward and no-op self-transitions", () => {
    expect(canTransitionTo(TicketStatus.ONGOING, TicketStatus.OPEN)).toBe(false);
    expect(canTransitionTo(TicketStatus.OPEN, TicketStatus.OPEN)).toBe(false);
    expect(canTransitionTo(TicketStatus.ONGOING, TicketStatus.ONGOING)).toBe(false);
  });
});
