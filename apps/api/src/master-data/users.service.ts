import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import type { InviteUserDto, UpdateUserDto, UserDto } from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

type UserRow = typeof schema.users.$inferSelect;

function toDto(r: UserRow): UserDto {
  return {
    userId: r.userId,
    email: r.email,
    fullName: r.fullName,
    role: r.role,
    isActive: r.isActive,
    authUid: r.authUid,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

/**
 * M2 — System User provisioning (ADR-0013). A User is an ACCOUNT (Google OAuth). Inviting
 * pre-authorizes an email on the `public.users` allowlist; no password, no identity is
 * created here — the account materializes on first Google login, when M1's AuthGuard binds
 * `auth_uid`. Nothing is deleted; deactivate with `is_active = false`.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async list(): Promise<UserDto[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .orderBy(schema.users.createdAt);
    return rows.map(toDto);
  }

  async invite(dto: InviteUserDto): Promise<UserDto> {
    // email is already lower-cased by the DTO transform, matching M1's JWT-email lookup.
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1);
    if (existing[0]) {
      throw new ConflictException(`A user with email ${dto.email} already exists`);
    }

    const rows = await this.db
      .insert(schema.users)
      .values({
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        isActive: true,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new InternalServerErrorException("Failed to create user");
    this.logger.log(`invited user ${dto.email} as ${dto.role}`);
    return toDto(row);
  }

  async update(userId: string, dto: UpdateUserDto): Promise<UserDto> {
    const rows = await this.db
      .update(schema.users)
      .set({ ...dto, updatedAt: sql`now()` })
      .where(eq(schema.users.userId, userId))
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`User ${userId} not found`);
    if (dto.isActive === false) this.logger.log(`deactivated user ${row.email}`);
    return toDto(row);
  }
}
