import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { schema, type Db, type Tx } from "@11ftc/db";
import {
  TicketStatus,
  type AssignTicketDto,
  type AuthContext,
  type CloseTicketDto,
  type EncodeTicketDto,
  type TicketDetailDto,
  type TicketDto,
  type TicketListQuery,
  type TicketListResult,
  type UpdateTicketDto,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";
import { NumberingService } from "../numbering/numbering.service.js";
import { EmployeeService } from "../employee/employee.service.js";
import { AuditService, type FieldChange } from "../audit/audit.service.js";
import { OutboxService, type SheetRowPayload } from "../outbox/outbox.service.js";
import { TicketRepository, type TicketPatch, type TicketRow } from "./ticket.repository.js";
import { canTransitionTo } from "./state-machine.js";

/** Timestamps set ONCE at the moment of the state, never recomputed (FR-21/23). */
function timestampsFor(status: TicketStatus): {
  ongoingAt: Date | null;
  closedAt: Date | null;
} {
  const now = new Date();
  if (status === TicketStatus.CLOSED) return { ongoingAt: null, closedAt: now };
  if (status === TicketStatus.ONGOING) return { ongoingAt: now, closedAt: null };
  return { ongoingAt: null, closedAt: null };
}

/**
 * M5 — Ticket Encoding & Lifecycle. THE transaction boundary for the whole system
 * (.claude/rules/domain.md). Number (M3), ticket row, audit rows (M6), and the outbox row
 * (M7) commit together or not at all. Nothing below this opens its own transaction; the
 * BullMQ "drain" dispatch happens AFTER commit. The state machine is enforced here,
 * server-side.
 */
@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly repo: TicketRepository,
    private readonly numbering: NumberingService,
    private readonly employee: EmployeeService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  /* ------------------------------ Encode (create) ------------------------------ */

  async encode(input: EncodeTicketDto, actor: AuthContext): Promise<TicketDto> {
    const row = await this.db.transaction((tx) => this.encodeTx(input, actor, tx));
    await this.dispatchDrain();
    this.logger.log(`encoded ${row.ticketNo} as ${row.status} by ${actor.userId}`);
    return this.requireDto(row.ticketId);
  }

  /**
   * The transactional core of encode — everything that must commit together. Public so the
   * atomicity gate can drive it inside a rollback-able tx (nothing is ever deleted, FR-9).
   */
  async encodeTx(
    input: EncodeTicketDto,
    actor: AuthContext,
    tx: Tx,
  ): Promise<TicketRow> {
    const employee = await this.employee.resolveOrCreate(
      input.employeeName,
      input.departmentId,
      tx,
    ); // M4
    const num = await this.numbering.next(parseEncodeDate(input.date), tx); // M3
    const ts = timestampsFor(input.status);

    const row = await this.repo.insert(
      {
        ticketNo: num.ticketNo,
        date: input.date,
        sequenceScope: num.sequenceScope,
        sequenceNumber: num.sequenceNumber,
        employeeId: employee.employeeId,
        mainIssueId: input.mainIssueId,
        concern: input.concern,
        assignedTo: input.assignedTo ?? null,
        createdBy: actor.userId,
        status: input.status,
        remarks: input.remarks ?? null,
        ongoingAt: ts.ongoingAt,
        closedAt: ts.closedAt,
      },
      tx,
    );

    await this.audit.log(
      "CREATE",
      row.ticketId,
      [{ fieldName: "status", previousValue: null, newValue: row.status }],
      actor,
      tx,
    ); // M6
    await this.outbox.enqueue(row.ticketId, await this.buildPayload(row, tx), tx); // M7
    return row;
  }

  /* -------------------------------- Mutations --------------------------------- */

  async update(
    ticketId: string,
    input: UpdateTicketDto,
    actor: AuthContext,
  ): Promise<TicketDto> {
    await this.db.transaction(async (tx) => {
      const current = await this.lock(ticketId, tx);
      const patch: TicketPatch = { updatedAt: new Date() };
      const changes: FieldChange[] = [];

      if (input.concern !== undefined && input.concern !== current.concern) {
        patch.concern = input.concern;
        changes.push(field("concern", current.concern, input.concern));
      }
      if (input.remarks !== undefined && (input.remarks ?? null) !== current.remarks) {
        patch.remarks = input.remarks ?? null;
        changes.push(field("remarks", current.remarks, input.remarks ?? null));
      }
      if (input.mainIssueId !== undefined && input.mainIssueId !== current.mainIssueId) {
        patch.mainIssueId = input.mainIssueId;
        changes.push(field("main_issue_id", current.mainIssueId, input.mainIssueId));
      }
      if (changes.length === 0) return; // no real change → no audit/outbox noise

      const updated = await this.repo.update(ticketId, patch, tx);
      await this.audit.log("UPDATE", ticketId, changes, actor, tx);
      await this.outbox.enqueue(ticketId, await this.buildPayload(updated, tx), tx);
    });
    await this.dispatchDrain();
    return this.requireDto(ticketId);
  }

  async assign(
    ticketId: string,
    input: AssignTicketDto,
    actor: AuthContext,
  ): Promise<TicketDto> {
    await this.db.transaction(async (tx) => {
      const current = await this.lock(ticketId, tx);
      if (current.assignedTo === input.assignedTo) return; // no change
      const updated = await this.repo.update(
        ticketId,
        { assignedTo: input.assignedTo, updatedAt: new Date() },
        tx,
      );
      await this.audit.log(
        "ASSIGN",
        ticketId,
        [field("assigned_to", current.assignedTo, input.assignedTo)],
        actor,
        tx,
      );
      await this.outbox.enqueue(ticketId, await this.buildPayload(updated, tx), tx);
    });
    await this.dispatchDrain();
    return this.requireDto(ticketId);
  }

  async markOngoing(ticketId: string, actor: AuthContext): Promise<TicketDto> {
    return this.transition(ticketId, TicketStatus.ONGOING, "STATUS_CHANGE", actor, {
      ongoingAt: new Date(),
    });
  }

  async close(
    ticketId: string,
    input: CloseTicketDto,
    actor: AuthContext,
  ): Promise<TicketDto> {
    await this.db.transaction(async (tx) => {
      const current = await this.lock(ticketId, tx);
      if (!canTransitionTo(current.status, TicketStatus.CLOSED)) {
        throw new ConflictException(`Cannot move ${current.status} → Closed`);
      }
      const patch: TicketPatch = {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
        updatedAt: new Date(),
      };
      const changes: FieldChange[] = [
        field("status", current.status, TicketStatus.CLOSED),
      ];
      if (input.remarks !== undefined && (input.remarks ?? null) !== current.remarks) {
        patch.remarks = input.remarks ?? null;
        changes.push(field("remarks", current.remarks, input.remarks ?? null));
      }
      const updated = await this.repo.update(ticketId, patch, tx);
      await this.audit.log("CLOSE", ticketId, changes, actor, tx);
      await this.outbox.enqueue(ticketId, await this.buildPayload(updated, tx), tx);
    });
    await this.dispatchDrain();
    return this.requireDto(ticketId);
  }

  /** Shared status-transition path: lock → legality → set status+timestamp → audit → outbox. */
  private async transition(
    ticketId: string,
    next: TicketStatus,
    action: "STATUS_CHANGE" | "CLOSE",
    actor: AuthContext,
    extraPatch: TicketPatch,
  ): Promise<TicketDto> {
    await this.db.transaction(async (tx) => {
      const current = await this.lock(ticketId, tx);
      if (!canTransitionTo(current.status, next)) {
        throw new ConflictException(`Cannot move ${current.status} → ${next}`);
      }
      const updated = await this.repo.update(
        ticketId,
        { status: next, updatedAt: new Date(), ...extraPatch },
        tx,
      );
      await this.audit.log(
        action,
        ticketId,
        [field("status", current.status, next)],
        actor,
        tx,
      );
      await this.outbox.enqueue(ticketId, await this.buildPayload(updated, tx), tx);
    });
    await this.dispatchDrain();
    return this.requireDto(ticketId);
  }

  /* --------------------------------- Reads ------------------------------------ */

  list(query: TicketListQuery): Promise<TicketListResult> {
    return this.repo.list(query);
  }

  async getDetail(ticketId: string): Promise<TicketDetailDto> {
    const dto = await this.repo.findDto(ticketId);
    if (!dto) throw new NotFoundException(`Ticket ${ticketId} not found`);
    const history = await this.audit.history(ticketId);
    return { ...dto, history };
  }

  /* -------------------------------- Internals --------------------------------- */

  private async lock(ticketId: string, tx: Tx): Promise<TicketRow> {
    const row = await this.repo.findByIdForUpdate(ticketId, tx);
    if (!row) throw new NotFoundException(`Ticket ${ticketId} not found`);
    return row;
  }

  private async requireDto(ticketId: string): Promise<TicketDto> {
    const dto = await this.repo.findDto(ticketId);
    if (!dto) throw new NotFoundException(`Ticket ${ticketId} not found`);
    return dto;
  }

  /** BullMQ "drain" trigger — fires AFTER commit, never inside the tx (FR domain rule). */
  private async dispatchDrain(): Promise<void> {
    // TODO(M8): enqueue the BullMQ "drain" job once Redis/the worker is wired. Until then the
    // outbox row stays PENDING and the M8 minute-sweeper picks it up — a lost trigger is
    // harmless by design (the durable outbox row is the source of truth, FR-29).
  }

  /** The denormalized sheet row (names + labels) for the outbox — computed at the boundary. */
  private async buildPayload(row: TicketRow, tx: Tx): Promise<SheetRowPayload> {
    const emp = await tx
      .select({ name: schema.employees.name, deptName: schema.departments.name })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.departmentId, schema.departments.departmentId),
      )
      .where(eq(schema.employees.employeeId, row.employeeId))
      .limit(1);
    const issue = await tx
      .select({ label: schema.mainIssueCategory.label })
      .from(schema.mainIssueCategory)
      .where(eq(schema.mainIssueCategory.mainIssueId, row.mainIssueId))
      .limit(1);
    let assignedToName: string | null = null;
    if (row.assignedTo) {
      const u = await tx
        .select({ fullName: schema.users.fullName })
        .from(schema.users)
        .where(eq(schema.users.userId, row.assignedTo))
        .limit(1);
      assignedToName = u[0]?.fullName ?? null;
    }
    return {
      ticketNo: row.ticketNo,
      date: row.date,
      status: row.status,
      employeeName: emp[0]?.name ?? "",
      department: emp[0]?.deptName ?? "",
      mainIssue: issue[0]?.label ?? "",
      concern: row.concern,
      assignedToName,
      remarks: row.remarks,
      ongoingAt: row.ongoingAt ? new Date(row.ongoingAt).toISOString() : null,
      closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : null,
    };
  }
}

function field(
  fieldName: string,
  previousValue: string | null,
  newValue: string | null,
): FieldChange {
  return { fieldName, previousValue, newValue };
}

/** Encode date is a calendar date; parse at UTC midnight so numbering's scope key matches. */
function parseEncodeDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
