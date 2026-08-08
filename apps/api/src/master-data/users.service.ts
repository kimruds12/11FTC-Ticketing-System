import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import type {
  AuthContext,
  ChangePasswordDto,
  InviteUserDto,
  InvitedUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserDto,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";
import { GoTrueAdminService, GoTrueError } from "../auth/gotrue-admin.service.js";
import { generatePassword } from "../auth/generate-password.js";

/**
 * Map a GoTrue failure onto the right HTTP status. Its 4xx are the caller's problem (a weak
 * or duplicate password), so returning them as 500 would send an administrator hunting a
 * server fault over a rejected input.
 */
function toHttp(error: unknown): unknown {
  if (error instanceof GoTrueError) {
    if (error.status === 409 || error.status === 422) {
      return new ConflictException(error.message);
    }
    if (error.status >= 400 && error.status < 500) {
      return new BadRequestException(error.message);
    }
  }
  return error;
}

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
 * M2 — System User provisioning (ADR-0018, superseding ADR-0013).
 *
 * A User is an ACCOUNT plus an allowlist row. Inviting creates BOTH: the GoTrue account with
 * an initial password, and the `public.users` row that authorizes it. Under Google OAuth the
 * account materialized on first login and this only wrote the allowlist row — with passwords
 * there is no self-service path, so provisioning happens here.
 *
 * Nothing in `public.users` is deleted; deactivate with `is_active = false`.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly gotrue: GoTrueAdminService,
  ) {}

  async list(): Promise<UserDto[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .orderBy(schema.users.createdAt);
    return rows.map(toDto);
  }

  /**
   * Provision a user: the auth account AND the `public.users` allowlist row (ADR-0018).
   *
   * Under Google OAuth this only wrote the allowlist row and the account materialized on
   * first login. With passwords there is no self-service path, so both must be created here.
   *
   * **The ordering is the whole problem.** GoTrue is a separate service over HTTP; it cannot
   * join our database transaction, so "both or neither" is not available. The order below
   * picks which half can be left behind:
   *
   *   1. Reserve the email in OUR table first. It is `UNIQUE`, so this is the cheap,
   *      transactional way to reject a duplicate before touching the auth server.
   *   2. Create the auth account. If it fails, the transaction rolls back and nothing exists.
   *   3. Write `auth_uid` back, still inside the transaction.
   *
   * The residual risk is a COMMIT that fails after step 2 — leaving an auth account with no
   * allowlist row. That account cannot do anything (`/me` returns 403 without a row), and the
   * next invite for that email adopts it rather than failing, so the state is self-healing.
   */
  async invite(dto: InviteUserDto): Promise<InvitedUserDto> {
    // email is already lower-cased by the DTO transform, matching M1's JWT-email lookup.
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1);
    if (existing[0]) {
      throw new ConflictException(`A user with email ${dto.email} already exists`);
    }

    const generated = dto.password ? null : generatePassword();
    const password = dto.password ?? generated;
    if (!password) throw new InternalServerErrorException("Failed to prepare a password");

    let createdAuthUid: string | null = null;
    try {
      const row = await this.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(schema.users)
          .values({
            email: dto.email,
            fullName: dto.fullName,
            role: dto.role,
            isActive: true,
          })
          .returning();
        const created = inserted[0];
        if (!created) throw new InternalServerErrorException("Failed to create user");

        // Adopt an account orphaned by an earlier partial invite rather than dead-ending the
        // administrator; signup is disabled on GoTrue, so the only way one exists is us.
        const existingAuth = await this.gotrue.findByEmail(dto.email);
        if (existingAuth) {
          await this.gotrue.setPassword(existingAuth.id, password);
          createdAuthUid = null; // pre-existing — not ours to roll back
          return (
            await tx
              .update(schema.users)
              .set({ authUid: existingAuth.id })
              .where(eq(schema.users.userId, created.userId))
              .returning()
          )[0]!;
        }

        const authUser = await this.gotrue.createUser(dto.email, password);
        createdAuthUid = authUser.id;
        return (
          await tx
            .update(schema.users)
            .set({ authUid: authUser.id })
            .where(eq(schema.users.userId, created.userId))
            .returning()
        )[0]!;
      });

      // NOTE: the password is deliberately absent from this line.
      this.logger.log(`invited user ${dto.email} as ${dto.role}`);
      return { ...toDto(row), temporaryPassword: generated };
    } catch (error) {
      // The transaction rolled back, so our row is gone; the auth account is not, because it
      // was never ours to roll back. Remove it so a retry starts clean.
      if (createdAuthUid) {
        await this.gotrue
          .deleteUser(createdAuthUid)
          .catch(() => this.logger.error(`orphaned auth account for ${dto.email}`));
      }
      throw toHttp(error);
    }
  }

  /**
   * Admin reset — the stand-in for "forgot password?", which needs email we do not have.
   * Returns the new password once, on the same terms as invite.
   */
  async resetPassword(userId: string, dto: ResetPasswordDto): Promise<InvitedUserDto> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`User ${userId} not found`);

    const generated = dto.password ? null : generatePassword();
    const password = dto.password ?? generated;
    if (!password) throw new InternalServerErrorException("Failed to prepare a password");

    // An allowlist row can predate ADR-0018 (invited under Google OAuth, never signed in), so
    // there may be no account yet. Create one rather than failing.
    let authUid = row.authUid;
    try {
      if (!authUid) {
        const existingAuth = await this.gotrue.findByEmail(row.email);
        authUid = existingAuth?.id ?? (await this.gotrue.createUser(row.email, password)).id;
        await this.db
          .update(schema.users)
          .set({ authUid, updatedAt: sql`now()` })
          .where(eq(schema.users.userId, userId));
        if (existingAuth) await this.gotrue.setPassword(authUid, password);
      } else {
        await this.gotrue.setPassword(authUid, password);
      }
    } catch (error) {
      throw toHttp(error);
    }

    this.logger.log(`reset password for ${row.email}`);
    return { ...toDto({ ...row, authUid }), temporaryPassword: generated };
  }

  /**
   * Self-service change. The CURRENT password is required and verified against GoTrue, so an
   * unlocked, unattended browser cannot be used to silently take the account over.
   */
  async changePassword(actor: AuthContext, dto: ChangePasswordDto): Promise<void> {
    const ok = await this.gotrue.verifyPassword(actor.email, dto.currentPassword);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");

    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userId, actor.userId))
      .limit(1);
    const row = rows[0];
    if (!row?.authUid) throw new NotFoundException("No account is linked to this user");

    try {
      await this.gotrue.setPassword(row.authUid, dto.newPassword);
    } catch (error) {
      throw toHttp(error);
    }
    this.logger.log(`password changed by ${row.email}`);
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
