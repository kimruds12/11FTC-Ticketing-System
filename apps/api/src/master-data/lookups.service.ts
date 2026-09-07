import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import type {
  CreateDepartmentDto,
  CreateMainIssueDto,
  DepartmentDto,
  MainIssueDto,
  UpdateDepartmentDto,
  UpdateMainIssueDto,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

/**
 * M2 — lookup vocabularies (departments + main-issue categories). Simple CRUD; nothing is
 * deleted (retire with `is_active = false`, so historical tickets keep readable labels).
 * Contents are OPEN-4 — real values come from the IT team, never invented here.
 */
@Injectable()
export class LookupsService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /* ------------------------------- Departments ------------------------------- */

  async listDepartments(includeInactive = false): Promise<DepartmentDto[]> {
    const rows = await this.db
      .select()
      .from(schema.departments)
      .where(includeInactive ? undefined : eq(schema.departments.isActive, true))
      .orderBy(schema.departments.name);
    return rows.map((r) => ({
      departmentId: r.departmentId,
      name: r.name,
      isActive: r.isActive,
    }));
  }

  async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const existing = await this.db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.name, dto.name))
      .limit(1);
    if (existing[0]) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }
    const rows = await this.db
      .insert(schema.departments)
      .values({ name: dto.name })
      .returning();
    const r = rows[0];
    if (!r) throw new InternalServerErrorException("Failed to create department");
    return { departmentId: r.departmentId, name: r.name, isActive: r.isActive };
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    const rows = await this.db
      .update(schema.departments)
      .set(dto)
      .where(eq(schema.departments.departmentId, id))
      .returning();
    const r = rows[0];
    if (!r) throw new NotFoundException(`Department ${id} not found`);
    return { departmentId: r.departmentId, name: r.name, isActive: r.isActive };
  }

  /* --------------------------- Main-issue categories -------------------------- */

  async listMainIssues(includeInactive = false): Promise<MainIssueDto[]> {
    const rows = await this.db
      .select()
      .from(schema.mainIssueCategory)
      .where(includeInactive ? undefined : eq(schema.mainIssueCategory.isActive, true))
      .orderBy(schema.mainIssueCategory.sortOrder, schema.mainIssueCategory.label);
    return rows.map((r) => ({
      mainIssueId: r.mainIssueId,
      label: r.label,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }));
  }

  async createMainIssue(dto: CreateMainIssueDto): Promise<MainIssueDto> {
    const existing = await this.db
      .select()
      .from(schema.mainIssueCategory)
      .where(eq(schema.mainIssueCategory.label, dto.label))
      .limit(1);
    if (existing[0]) {
      throw new ConflictException(`Category "${dto.label}" already exists`);
    }
    const rows = await this.db
      .insert(schema.mainIssueCategory)
      .values({ label: dto.label, sortOrder: dto.sortOrder ?? 0 })
      .returning();
    const r = rows[0];
    if (!r) throw new InternalServerErrorException("Failed to create category");
    return {
      mainIssueId: r.mainIssueId,
      label: r.label,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    };
  }

  async updateMainIssue(id: string, dto: UpdateMainIssueDto): Promise<MainIssueDto> {
    const rows = await this.db
      .update(schema.mainIssueCategory)
      .set(dto)
      .where(eq(schema.mainIssueCategory.mainIssueId, id))
      .returning();
    const r = rows[0];
    if (!r) throw new NotFoundException(`Category ${id} not found`);
    return {
      mainIssueId: r.mainIssueId,
      label: r.label,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    };
  }
}
