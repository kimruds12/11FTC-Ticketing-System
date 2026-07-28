import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, like, ne, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { schema, type Db, type Tx } from "@11ftc/db";
import {
  normalizeName,
  type CreateEmployeeDto,
  type EmployeeDto,
  type UpdateEmployeeDto,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

type EmployeeRow = typeof schema.employees.$inferSelect;

/** Postgres unique_violation (23505), unwrapping drizzle's error wrapper. */
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Employees (M2 directory CRUD + M4 resolve-or-create). An Employee is the ticket REPORTER —
 * an auth-free directory entry, NOT an account (ADR-0013). Dedup is by `normalizeName` + the
 * `name_normalized` unique index; the admin-create path (M2), the inline resolve-or-create
 * (M4), and search all run that same normalize (M4 invariant 1). Nothing is deleted — retire
 * with `is_active`.
 */
@Injectable()
export class EmployeeService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async list(includeInactive = false): Promise<EmployeeDto[]> {
    const rows = await this.db
      .select({
        employeeId: schema.employees.employeeId,
        name: schema.employees.name,
        departmentId: schema.employees.departmentId,
        departmentName: schema.departments.name,
        isActive: schema.employees.isActive,
        createdAt: schema.employees.createdAt,
        updatedAt: schema.employees.updatedAt,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.departmentId, schema.departments.departmentId),
      )
      .where(includeInactive ? undefined : eq(schema.employees.isActive, true))
      .orderBy(schema.employees.name);

    return rows.map((r) => ({
      employeeId: r.employeeId,
      name: r.name,
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      isActive: r.isActive,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDto> {
    const nameNormalized = normalizeName(dto.name);
    const dept = await this.requireDepartment(dto.departmentId);

    const dup = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.nameNormalized, nameNormalized))
      .limit(1);
    if (dup[0]) {
      throw new ConflictException(`Employee "${dto.name.trim()}" already exists`);
    }

    const rows = await this.db
      .insert(schema.employees)
      .values({
        name: dto.name.trim(),
        nameNormalized,
        departmentId: dto.departmentId,
        isActive: true,
      })
      .returning();
    const r = rows[0];
    if (!r) throw new InternalServerErrorException("Failed to create employee");
    return this.toDto(r, dept.name);
  }

  async update(employeeId: string, dto: UpdateEmployeeDto): Promise<EmployeeDto> {
    const patch: PgUpdateSetSource<typeof schema.employees> = { updatedAt: sql`now()` };

    if (dto.name !== undefined) {
      const nameNormalized = normalizeName(dto.name);
      const dup = await this.db
        .select()
        .from(schema.employees)
        .where(
          and(
            eq(schema.employees.nameNormalized, nameNormalized),
            ne(schema.employees.employeeId, employeeId),
          ),
        )
        .limit(1);
      if (dup[0]) {
        throw new ConflictException(`Another employee "${dto.name.trim()}" already exists`);
      }
      patch.name = dto.name.trim();
      patch.nameNormalized = nameNormalized;
    }

    let deptName: string | null = null;
    if (dto.departmentId !== undefined) {
      deptName = (await this.requireDepartment(dto.departmentId)).name;
      patch.departmentId = dto.departmentId;
    }
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    const rows = await this.db
      .update(schema.employees)
      .set(patch)
      .where(eq(schema.employees.employeeId, employeeId))
      .returning();
    const r = rows[0];
    if (!r) throw new NotFoundException(`Employee ${employeeId} not found`);

    if (deptName === null) {
      const d = await this.db
        .select({ name: schema.departments.name })
        .from(schema.departments)
        .where(eq(schema.departments.departmentId, r.departmentId))
        .limit(1);
      deptName = d[0]?.name ?? null;
    }
    return this.toDto(r, deptName);
  }

  /**
   * M4 — search-as-you-type (FR-14). Normalizes `q` with the SAME `normalizeName` the stored
   * column uses, then substring-matches ACTIVE employees. Match-first: the encode form shows
   * these before offering "create new".
   */
  async search(q: string, limit = 10): Promise<EmployeeDto[]> {
    const needle = normalizeName(q);
    if (!needle) return [];
    const rows = await this.db
      .select({
        employeeId: schema.employees.employeeId,
        name: schema.employees.name,
        departmentId: schema.employees.departmentId,
        departmentName: schema.departments.name,
        isActive: schema.employees.isActive,
        createdAt: schema.employees.createdAt,
        updatedAt: schema.employees.updatedAt,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.departmentId, schema.departments.departmentId),
      )
      .where(
        and(
          eq(schema.employees.isActive, true),
          like(schema.employees.nameNormalized, `%${needle}%`),
        ),
      )
      .orderBy(schema.employees.name)
      .limit(limit);
    return rows.map((r) => ({
      employeeId: r.employeeId,
      name: r.name,
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      isActive: r.isActive,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));
  }

  /**
   * M4 — inline resolve-or-create used by the encode transaction (M5). Returns the existing
   * employee by normalized name, or creates one — INSIDE the caller's `tx`, so a new employee
   * and the ticket that introduced them commit together (FR-13). Never creates a
   * near-duplicate (M4 invariant 1); a concurrent create of the same name is caught and
   * resolved to the winning row — no unique-violation crash reaches the user (FR-15).
   */
  async resolveOrCreate(
    name: string,
    departmentId: string,
    tx: Tx,
  ): Promise<EmployeeRow> {
    const nameNormalized = normalizeName(name);

    const found = await tx
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.nameNormalized, nameNormalized))
      .limit(1);
    if (found[0]) return found[0];

    try {
      // SAVEPOINT: a unique-violation from a concurrent create rolls back to HERE, not the
      // whole encode transaction — the ticket still commits.
      return await tx.transaction(async (sp) => {
        const inserted = await sp
          .insert(schema.employees)
          .values({ name: name.trim(), nameNormalized, departmentId, isActive: true })
          .returning();
        const row = inserted[0];
        if (!row) throw new InternalServerErrorException("employee insert returned no row");
        return row;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A concurrent transaction created the same name first — re-read and return the winner.
      const after = await tx
        .select()
        .from(schema.employees)
        .where(eq(schema.employees.nameNormalized, nameNormalized))
        .limit(1);
      const row = after[0];
      if (!row) {
        throw new InternalServerErrorException("employee vanished after unique violation");
      }
      return row;
    }
  }

  private async requireDepartment(departmentId: string): Promise<{ name: string }> {
    const dept = await this.db
      .select({ name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.departmentId, departmentId))
      .limit(1);
    if (!dept[0]) throw new NotFoundException(`Department ${departmentId} not found`);
    return dept[0];
  }

  private toDto(r: EmployeeRow, departmentName: string | null): EmployeeDto {
    return {
      employeeId: r.employeeId,
      name: r.name,
      departmentId: r.departmentId,
      departmentName,
      isActive: r.isActive,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }
}
