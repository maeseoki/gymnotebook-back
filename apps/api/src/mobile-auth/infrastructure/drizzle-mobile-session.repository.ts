import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema.js';
import type { Database } from '../../shared/db.js';
import type { DbExecutor } from '../../shared/transaction.js';
import { inTransaction } from '../../shared/transaction.js';
import { InvalidMobileSessionError } from '../domain/mobile-session.errors.js';
import type { MobileSessionTokenRow, MobileSessionView } from '../domain/mobile-session.js';
import type {
  CleanupMobileSessionsInput,
  CreateMobileSessionTokenInput,
  MobileSessionRepository,
  MobileSessionTransactionRepositories,
  MobileSessionUnitOfWork,
  RotateMobileSessionTokenInput,
} from '../domain/mobile-session.repository.js';

type MobileSessionRow = typeof schema.mobileSessions.$inferSelect;

export class DrizzleMobileSessionUnitOfWork implements MobileSessionUnitOfWork {
  constructor(private readonly db: Database) {}

  transaction<T>(
    work: (repositories: MobileSessionTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    return inTransaction(this.db, (tx) =>
      work({ mobileSessions: new DrizzleMobileSessionRepository(tx) }),
    );
  }
}

export class DrizzleMobileSessionRepository implements MobileSessionRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(input: CreateMobileSessionTokenInput): Promise<MobileSessionTokenRow> {
    const inserted = await this.db
      .insert(schema.mobileSessions)
      .values({
        sessionId: input.sessionId,
        userId: input.userId,
        tokenFamilyId: input.tokenFamilyId,
        refreshTokenHash: input.refreshTokenHash,
        previousSessionRowId: input.previousSessionRowId,
        deviceName: input.device.name ?? null,
        devicePlatform: input.device.platform ?? null,
        createdAt: input.now,
        lastUsedAt: input.now,
        rotatedAt: null,
        expiresAt: input.expiresAt,
        revokedAt: null,
      })
      .$returningId();
    const id = inserted[0]?.id;
    if (typeof id !== 'number') {
      throw new Error('Failed to create mobile session');
    }
    const row = await this.findById(id);
    if (!row) {
      throw new Error('Failed to load created mobile session');
    }
    return row;
  }

  async findByRefreshTokenHashForUpdate(hash: string): Promise<MobileSessionTokenRow | null> {
    const rows = await this.db
      .select()
      .from(schema.mobileSessions)
      .where(eq(schema.mobileSessions.refreshTokenHash, hash))
      .limit(1)
      .for('update');
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findUserForSession(userId: number) {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.users.id, userId));

    const first = rows[0];
    if (!first) {
      return null;
    }

    return {
      id: first.id,
      username: first.username,
      email: first.email,
      roles: rows.flatMap((row) => (row.roleName ? [row.roleName] : [])),
    };
  }

  async rotate(input: RotateMobileSessionTokenInput): Promise<MobileSessionTokenRow> {
    const inserted = await this.db
      .insert(schema.mobileSessions)
      .values({
        sessionId: input.previousRow.sessionId,
        userId: input.previousRow.userId,
        tokenFamilyId: input.previousRow.tokenFamilyId,
        refreshTokenHash: input.refreshTokenHash,
        previousSessionRowId: input.previousRow.id,
        deviceName: input.previousRow.deviceName,
        devicePlatform: input.previousRow.devicePlatform,
        createdAt: input.previousRow.createdAt,
        lastUsedAt: input.now,
        rotatedAt: null,
        expiresAt: input.expiresAt,
        revokedAt: null,
      })
      .$returningId();
    const newId = inserted[0]?.id;
    if (typeof newId !== 'number') {
      throw new Error('Failed to rotate mobile session');
    }

    const updateResult = await this.db
      .update(schema.mobileSessions)
      .set({
        replacedBySessionRowId: newId,
        rotatedAt: input.now,
        revokedAt: input.now,
        lastUsedAt: input.now,
      })
      .where(
        and(
          eq(schema.mobileSessions.id, input.previousRow.id),
          isNull(schema.mobileSessions.replacedBySessionRowId),
          isNull(schema.mobileSessions.revokedAt),
        ),
      );

    if (updatedRows(updateResult) !== 1) {
      throw new InvalidMobileSessionError();
    }

    const row = await this.findById(newId);
    if (!row) {
      throw new Error('Failed to load rotated mobile session');
    }
    return row;
  }

  async revokeTokenFamily(tokenFamilyId: string, now: string): Promise<number> {
    const rows = await this.db
      .select({ id: schema.mobileSessions.id })
      .from(schema.mobileSessions)
      .where(eq(schema.mobileSessions.tokenFamilyId, tokenFamilyId));
    if (rows.length === 0) {
      return 0;
    }
    await this.db
      .update(schema.mobileSessions)
      .set({ revokedAt: now, lastUsedAt: now })
      .where(eq(schema.mobileSessions.tokenFamilyId, tokenFamilyId));
    return rows.length;
  }

  async revokeByRefreshTokenHash(hash: string, now: string): Promise<void> {
    const row = await this.findByRefreshTokenHashForUpdate(hash);
    if (row) {
      await this.revokeTokenFamily(row.tokenFamilyId, now);
    }
  }

  async revokeBySessionIdForUser(input: {
    userId: number;
    sessionId: string;
    now: string;
  }): Promise<number> {
    const rows = await this.db
      .select({ id: schema.mobileSessions.id })
      .from(schema.mobileSessions)
      .where(
        and(
          eq(schema.mobileSessions.userId, input.userId),
          eq(schema.mobileSessions.sessionId, input.sessionId),
        ),
      );
    if (rows.length === 0) {
      return 0;
    }
    await this.db
      .update(schema.mobileSessions)
      .set({ revokedAt: input.now, lastUsedAt: input.now })
      .where(
        and(
          eq(schema.mobileSessions.userId, input.userId),
          eq(schema.mobileSessions.sessionId, input.sessionId),
        ),
      );
    return rows.length;
  }

  async revokeAllForUser(input: {
    userId: number;
    now: string;
    exceptSessionId?: string;
  }): Promise<number> {
    const predicate = input.exceptSessionId
      ? and(
          eq(schema.mobileSessions.userId, input.userId),
          ne(schema.mobileSessions.sessionId, input.exceptSessionId),
        )
      : eq(schema.mobileSessions.userId, input.userId);
    const rows = await this.db
      .select({ id: schema.mobileSessions.id })
      .from(schema.mobileSessions)
      .where(predicate);
    if (rows.length === 0) {
      return 0;
    }
    await this.db
      .update(schema.mobileSessions)
      .set({ revokedAt: input.now, lastUsedAt: input.now })
      .where(predicate);
    return rows.length;
  }

  async listActiveByUser(input: {
    userId: number;
    now: string;
    currentSessionId?: string;
  }): Promise<MobileSessionView[]> {
    const rows = await this.db
      .select()
      .from(schema.mobileSessions)
      .where(
        and(
          eq(schema.mobileSessions.userId, input.userId),
          isNull(schema.mobileSessions.revokedAt),
          isNull(schema.mobileSessions.replacedBySessionRowId),
          gt(schema.mobileSessions.expiresAt, input.now),
        ),
      )
      .orderBy(asc(schema.mobileSessions.createdAt), asc(schema.mobileSessions.id));

    return rows.map((row) => ({
      id: row.sessionId,
      deviceName: row.deviceName,
      devicePlatform: row.devicePlatform,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      current: row.sessionId === input.currentSessionId,
    }));
  }

  async isActiveSessionForUser(input: {
    userId: number;
    sessionId: string;
    now: string;
  }): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.mobileSessions.id })
      .from(schema.mobileSessions)
      .where(
        and(
          eq(schema.mobileSessions.userId, input.userId),
          eq(schema.mobileSessions.sessionId, input.sessionId),
          isNull(schema.mobileSessions.revokedAt),
          isNull(schema.mobileSessions.replacedBySessionRowId),
          gt(schema.mobileSessions.expiresAt, input.now),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  async cleanup(input: CleanupMobileSessionsInput): Promise<number> {
    const rows = await this.db
      .select({ id: schema.mobileSessions.id })
      .from(schema.mobileSessions)
      .where(
        and(
          or(
            lt(schema.mobileSessions.expiresAt, input.expiredBefore),
            and(
              lt(schema.mobileSessions.revokedAt, input.revokedBefore),
              isNotNull(schema.mobileSessions.revokedAt),
            ),
          ),
          sql`NOT EXISTS (
            SELECT 1
            FROM mobile_sessions child
            WHERE child.previous_session_row_id = ${schema.mobileSessions.id}
          )`,
        ),
      )
      .orderBy(asc(schema.mobileSessions.expiresAt), asc(schema.mobileSessions.id))
      .limit(input.limit);

    const ids = rows.map((row) => row.id);
    if (ids.length === 0) {
      return 0;
    }
    await this.db.delete(schema.mobileSessions).where(inArray(schema.mobileSessions.id, ids));
    return ids.length;
  }

  private async findById(id: number): Promise<MobileSessionTokenRow | null> {
    const rows = await this.db
      .select()
      .from(schema.mobileSessions)
      .where(eq(schema.mobileSessions.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

function mapRow(row: MobileSessionRow): MobileSessionTokenRow {
  return {
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    tokenFamilyId: row.tokenFamilyId,
    refreshTokenHash: row.refreshTokenHash,
    previousSessionRowId: row.previousSessionRowId,
    replacedBySessionRowId: row.replacedBySessionRowId,
    deviceName: row.deviceName,
    devicePlatform: row.devicePlatform,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
  };
}

function updatedRows(updateResult: unknown): number | undefined {
  if (Array.isArray(updateResult)) {
    return updatedRows(updateResult[0]);
  }
  if (typeof updateResult !== 'object' || updateResult === null) {
    return undefined;
  }
  if ('affectedRows' in updateResult && typeof updateResult.affectedRows === 'number') {
    return updateResult.affectedRows;
  }
  if ('rowsAffected' in updateResult && typeof updateResult.rowsAffected === 'number') {
    return updateResult.rowsAffected;
  }
  return undefined;
}
