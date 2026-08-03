import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, like, ne, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { schema, type Db, type Tx } from "@11ftc/db";
import {
  normalizeName,
  type CreateTechnicianDto,
  type TechnicianDto,
  type TicketAssigneeDto,
  type UpdateTechnicianDto,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

type TechnicianRow = typeof schema.technicians.$inferSelect;

/** Postgres unique_violation (23505), unwrapping drizzle's error wrapper. */
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Technicians — the IT people who HANDLE tickets (ADR-0017). Structurally a twin of
 * `EmployeeService`, and that is deliberate: the encoder gets the identical
 * type-a-name-or-pick-a-match experience for both halves of a ticket, and the same
 * `normalizeName` + unique-index pair prevents "Kim" / "kim" / "Kim " becoming three people.
 *
 * A technician is NOT an account. `userId` is an optional bridge for staff who also sign in.
 * Nothing is deleted — retire with `is_active`.
 */
@Injectable()
export class TechnicianService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async list(includeInactive = false): Promise<TechnicianDto[]> {
    const rows = await this.db
      .select()
      .from(schema.technicians)
      .where(includeInactive ? undefined : eq(schema.technicians.isActive, true))
      .orderBy(asc(schema.technicians.name));
    return rows.map(toDto);
  }

  /** Match-first search-as-you-type for the encode form (any authenticated role). */
  async search(q: string, limit = 10): Promise<TechnicianDto[]> {
    const needle = normalizeName(q);
    if (!needle) return this.list();
    const rows = await this.db
      .select()
      .from(schema.technicians)
      .where(
        and(
          eq(schema.technicians.isActive, true),
          like(schema.technicians.nameNormalized, `%${needle}%`),
        ),
      )
      .orderBy(asc(schema.technicians.name))
      .limit(limit);
    return rows.map(toDto);
  }

  async create(dto: CreateTechnicianDto): Promise<TechnicianDto> {
    const nameNormalized = normalizeName(dto.name);
    const dup = await this.db
      .select()
      .from(schema.technicians)
      .where(eq(schema.technicians.nameNormalized, nameNormalized))
      .limit(1);
    if (dup[0]) throw new ConflictException(`Technician "${dto.name.trim()}" already exists`);

    const rows = await this.db
      .insert(schema.technicians)
      .values({
        name: dto.name.trim(),
        nameNormalized,
        userId: dto.userId ?? null,
        isActive: true,
      })
      .returning();
    const r = rows[0];
    if (!r) throw new InternalServerErrorException("Failed to create technician");
    return toDto(r);
  }

  async update(technicianId: string, dto: UpdateTechnicianDto): Promise<TechnicianDto> {
    const patch: PgUpdateSetSource<typeof schema.technicians> = { updatedAt: sql`now()` };

    if (dto.name !== undefined) {
      const nameNormalized = normalizeName(dto.name);
      const dup = await this.db
        .select()
        .from(schema.technicians)
        .where(
          and(
            eq(schema.technicians.nameNormalized, nameNormalized),
            ne(schema.technicians.technicianId, technicianId),
          ),
        )
        .limit(1);
      if (dup[0]) {
        throw new ConflictException(`Another technician "${dto.name.trim()}" already exists`);
      }
      patch.name = dto.name.trim();
      patch.nameNormalized = nameNormalized;
    }
    if (dto.userId !== undefined) patch.userId = dto.userId ?? null;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    const rows = await this.db
      .update(schema.technicians)
      .set(patch)
      .where(eq(schema.technicians.technicianId, technicianId))
      .returning();
    const r = rows[0];
    if (!r) throw new NotFoundException(`Technician ${technicianId} not found`);
    return toDto(r);
  }

  /**
   * Inline resolve-or-create used by the encode/assign transactions (M5). Takes the raw names
   * the encoder typed and returns them IN ORDER, creating any that are new — INSIDE the
   * caller's `tx`, so a technician recorded for the first time and the ticket that introduced
   * them commit together.
   *
   * Order matters: it becomes the sheet's column G ("Kim/Paul", not "Paul/Kim").
   */
  async resolveOrCreateMany(names: readonly string[], tx: Tx): Promise<TicketAssigneeDto[]> {
    if (names.length === 0) return [];

    const keys = names.map((n) => normalizeName(n));
    const existing = await tx
      .select()
      .from(schema.technicians)
      .where(inArray(schema.technicians.nameNormalized, keys));
    const byKey = new Map(existing.map((r) => [r.nameNormalized, r] as const));

    const resolved: TicketAssigneeDto[] = [];
    for (const [i, name] of names.entries()) {
      const key = keys[i]!;
      const hit = byKey.get(key);
      if (hit) {
        resolved.push({ technicianId: hit.technicianId, name: hit.name });
        continue;
      }
      const created = await this.insertOne(name.trim(), key, tx);
      byKey.set(key, created);
      resolved.push({ technicianId: created.technicianId, name: created.name });
    }
    return resolved;
  }

  /** Replace a ticket's assignees wholesale. Returns the new list, in order. */
  async setAssignees(
    ticketId: string,
    names: readonly string[],
    tx: Tx,
  ): Promise<TicketAssigneeDto[]> {
    const resolved = await this.resolveOrCreateMany(names, tx);

    // Rows in `ticket_assignees` are pure join rows, not history — the audit log (M6) is what
    // records that assignment changed. FR-9's "nothing is deleted" protects tickets and audit
    // rows; a stale join row is not a record of anything.
    await tx
      .delete(schema.ticketAssignees) // allow-delete-scan-skip
      .where(eq(schema.ticketAssignees.ticketId, ticketId));

    if (resolved.length) {
      await tx.insert(schema.ticketAssignees).values(
        resolved.map((a, position) => ({
          ticketId,
          technicianId: a.technicianId,
          position,
        })),
      );
    }
    return resolved;
  }

  /** The assignees of one ticket, in display order. */
  async assigneesOf(ticketId: string, tx: Tx | Db): Promise<TicketAssigneeDto[]> {
    const rows = await tx
      .select({
        technicianId: schema.technicians.technicianId,
        name: schema.technicians.name,
      })
      .from(schema.ticketAssignees)
      .innerJoin(
        schema.technicians,
        eq(schema.ticketAssignees.technicianId, schema.technicians.technicianId),
      )
      .where(eq(schema.ticketAssignees.ticketId, ticketId))
      .orderBy(asc(schema.ticketAssignees.position));
    return rows;
  }

  private async insertOne(name: string, key: string, tx: Tx): Promise<TechnicianRow> {
    try {
      // SAVEPOINT: a unique-violation from a concurrent create rolls back to HERE, not the
      // whole encode transaction — the ticket still commits.
      return await tx.transaction(async (sp) => {
        const inserted = await sp
          .insert(schema.technicians)
          .values({ name, nameNormalized: key, isActive: true })
          .returning();
        const row = inserted[0];
        if (!row) throw new InternalServerErrorException("technician insert returned no row");
        return row;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const after = await tx
        .select()
        .from(schema.technicians)
        .where(eq(schema.technicians.nameNormalized, key))
        .limit(1);
      const row = after[0];
      if (!row) {
        throw new InternalServerErrorException("technician vanished after unique violation");
      }
      return row;
    }
  }
}

function toDto(r: TechnicianRow): TechnicianDto {
  return {
    technicianId: r.technicianId,
    name: r.name,
    userId: r.userId,
    isActive: r.isActive,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}
