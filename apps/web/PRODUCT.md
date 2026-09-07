# Product

<!-- impeccable:product-schema 1 -->

> **This file is not the requirements authority.** `docs/11FTC_SRS_Rev3.md` and the rest of
> `docs/` are, per the repo's `CLAUDE.md`. PRODUCT.md records durable product truth for design
> work; where the two disagree, the SRS wins and this file is wrong. FR references below point
> at the SRS rather than restating it.

## Platform

web

## Users

**Two roles, both inside the 11FTC IT department.** Confirmed in the SRS §3.3 and enforced by
`roles.guard.ts`.

- **IT Administrator** — encodes, plus directory management, audit and access monitoring.
- **IT Staff** — encodes and works tickets.

**Employees are not users.** The person who reports a concern never signs in; they are a
directory record (159 today). **Technicians are not accounts either** (ADR-0017): who handled a
ticket is a name in a directory, because ~74% of real handlers never held a login and two-person
work is ~21% of the history.

The audience is small and repeating — a handful of concurrent users who will use this daily for
years. They are not learning it once; they are living in it.

## Product Purpose

Replace the manual effort of maintaining the department's IT ticket spreadsheet, without taking
the spreadsheet away.

The stated purpose, in the user's words, is **to lessen the manual encoding process**. Success is
therefore measured in encoding effort, not in features: a ticket that used to be typed into a
sheet by hand should take less work, less re-typing, and produce fewer transcription errors.

Volume is small and honest — tens of tickets a day, ~301 on record across roughly six weeks. The
hard problems here are correctness and speed-of-entry, not scale.

## Positioning

**The system records work that has already been done.** The department fixes the concern first
and writes it down afterwards, so a ticket is normally encoded *already Closed*. There is no
assign → in-progress → resolve → close queue, and adding one would describe a process this team
does not have. Three statuses only — Open, Ongoing, Closed — and Closed is terminal (FR-8); a
recurrence is a new ticket, not a reopened one.

**The spreadsheet is kept, not replaced.** Sync is one-way, database → sheet (FR-25), and the
team keeps working in the `Tickets` tab they already use. A neighbouring tool would migrate the
team off their sheet; this one mirrors into it, which is why adoption does not require anyone to
change where they look.

## Operating Context

- **Primary scene: desktop, at a desk.** This is where the bulk of encoding happens and what the
  interface is optimised for.
- **Secondary scene: a phone, away from the desk.** Confirmed requirement — IT staff must be able
  to encode properly on a small screen, not merely view. Responsive is a functional requirement
  here, not a nicety.
- **The Google Sheet remains live.** The team still opens and edits it. Rows are located by
  ticket number in column B, never by position, because the sheet is newest-first and every new
  ticket shifts every row below it (ADR-0016).
- **The sheet contains real employee names** and is gitignored; it is PII and must never be
  committed or pasted.
- **The source data is imperfect and known to be so.** Several cells in the team's sheet are
  formulas rather than literals and produce a different value on every export.

## Capabilities and Constraints

**Confirmed and built:** ticket encoding with backdating; inline creation of employees and
technicians during encoding; department and main-issue lookups; dashboard analytics with
day/week/month granularity; a department × period report cross-tab with CSV and print export;
one-way Sheets sync via a transactional outbox.

**Confirmed and NOT built — recorded so it is not mistaken for existing:**

- **Bulk encoding.** The user called this "very ideal" and directly aligned with the product
  purpose. Encoding is currently strictly one ticket at a time. This is a wanted capability, not
  a shipped one, and no design should imply otherwise until it exists.
- **Audit Logs page.** The `audit_log` table is real, populated, and required (FR-33–35), but
  `/audit-logs` renders a hardcoded array. The data exists; the page does not read it.
- **Access Activity page.** `/access-activity` renders fabricated IPs and devices and is not
  linked from the navigation. **No data source for it exists** — there is no session, login, or
  auth-event table in the schema, and nothing captures sign-in events. Building it truthfully
  requires new capture, not a new screen.

**Confirmed access rule (new, from this interview):** Audit Logs and Access Activity are
**IT Administrator only**. IT Staff must not see either.

**Durable technical constraints that shape the product:**

- Nothing is ever deleted — no ticket, no audit row, no lookup (FR-9/FR-35). Retirement is
  `is_active`. This means junk created by a bad import is permanent, so entry validation matters
  more than it would elsewhere.
- Ticket numbers are allocated atomically and persisted once, never recomputed.
- `ongoing_at` / `closed_at` are stamped once, at transition.
- Sync failure must never block or fail encoding (FR-29).

**Explicitly undecided (SRS Open Items) — do not resolve these in design:**

- **OPEN-1** ticket numbering scope (date vs year).
- **OPEN-2** whether IT Staff should see dashboard analytics. They currently do, including
  per-technician volume. Note this is a *different* question from the Audit/Access rule confirmed
  above, which is settled.
- Whether ticket status may be corrected after an encoding mistake. The user has deferred this;
  it is not abandoned.

## Brand Commitments

**Confirmed binding by the user: "the name, logo and color theme is the standard design system
for this application."** Recorded as-is, not expanded.

- **Name:** **FTraCe** — "11FTC IT Support System" (`layout.tsx` metadata).
- **Logo:** `public/logo.png`.
- **Primary colour:** `#B91C1C`, with the full 50–950 ramp already defined in
  `tailwind.config.ts`.
- **Typeface:** Inter.
- **Photography on hand:** `public/RedbackgroundImage.jpg`, `public/11FTCLoginImage.jpg`
  (captioned "11FTC Facility" — real premises, not stock).

## Evidence on Hand

**Real, in the database now:** 301 tickets (`IT-2026-0001`–`IT-2026-0307`), 159 employees, 24
departments, 7 main-issue categories, 9 technicians, ~6 weeks of history from 2026-06-19.

**Real assets:** the three images above, plus the department's live spreadsheet (gitignored,
PII).

**Absences future work must NOT fabricate:**

- No sign-in / access-event data of any kind exists.
- No SLA, priority, or response-time targets exist. FR-21 measures *whether* something was
  solved, never whether it was solved on time; the fields required for the latter do not exist.
- No customer testimonials, benchmarks, pricing, or external validation — this is an internal
  tool with no such material.
- Four ticket numbers (86, 218, 250, 262) have no row in the source sheet. They are the team's
  own skipped numbers, not lost data.

## Product Principles

1. **Encoding effort is the metric.** Every design decision on the encode path is judged by
   whether it removes typing, re-typing, or hesitation. This is the stated reason the product
   exists; a feature that looks richer but adds keystrokes has failed.
2. **Record reality, do not model an idealised process.** The department fixes first and records
   after. The interface must make "already Closed" the natural, fast path rather than an
   exception to a workflow nobody follows.
3. **Never imply data the system does not hold.** A screen that presents invented figures as real
   is worse than an obviously unfinished one — those numbers get carried into meetings. Applies
   to Audit Logs and Access Activity today.
4. **Permanence demands care at entry.** Because nothing can be deleted, the moment of entry is
   the only moment a mistake is cheap. Validation, suggestion, and confirmation belong there.
5. **The phone is for encoding, not just reading.** Small-screen support is measured by whether a
   technician can complete a ticket on it, not by whether the page reflows.

## Accessibility & Inclusion

No formal standard (WCAG level or equivalent) has been established for this project — recorded as
undecided rather than assumed.

One confirmed inclusion requirement: **full encoding capability on small screens**, so a
technician away from a desk is not a second-class user of the system.
