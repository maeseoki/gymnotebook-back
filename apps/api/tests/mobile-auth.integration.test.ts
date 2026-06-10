import { fileURLToPath } from 'node:url';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../drizzle/schema.js';
import { seedRoles } from '../scripts/seed-roles.js';
import { createTestConfig } from '../src/app.js';
import { createMobileSession } from '../src/mobile-auth/application/create-mobile-session.js';
import { listMobileSessionsForUser } from '../src/mobile-auth/application/list-mobile-sessions.js';
import { revokeMobileSessionByRefreshToken } from '../src/mobile-auth/application/revoke-mobile-session.js';
import { rotateMobileSession } from '../src/mobile-auth/application/rotate-mobile-session.js';
import type { MobileAccessTokenIssuer } from '../src/mobile-auth/domain/mobile-access-token-issuer.js';
import {
  InvalidMobileSessionError,
  MobileRefreshTokenReuseError,
  MobileSessionError,
  MobileSessionExpiredError,
  MobileSessionRevokedError,
  toExternalMobileSessionError,
} from '../src/mobile-auth/domain/mobile-session.errors.js';
import type { MobileSessionUser } from '../src/mobile-auth/domain/mobile-session.js';
import type { Clock } from '../src/mobile-auth/domain/mobile-session-time.js';
import { CryptoRefreshTokenService } from '../src/mobile-auth/infrastructure/crypto-refresh-token.service.js';
import {
  DrizzleMobileSessionRepository,
  DrizzleMobileSessionUnitOfWork,
} from '../src/mobile-auth/infrastructure/drizzle-mobile-session.repository.js';
import { createDatabaseClient, type DatabaseClient } from '../src/shared/db.js';
import type { Env } from '../src/shared/env.js';
import { isUniqueConstraintError } from '../src/shared/persistence-errors.js';
import { inTransaction } from '../src/shared/transaction.js';

class FixedClock implements Clock {
  constructor(private value: Date) {}

  now(): Date {
    return this.value;
  }

  set(value: string): void {
    this.value = new Date(value);
  }
}

class TestAccessTokenIssuer implements MobileAccessTokenIssuer {
  fail = false;

  issue(claims: Parameters<MobileAccessTokenIssuer['issue']>[0]) {
    if (this.fail) {
      throw new Error('access token failed');
    }
    return {
      token: `access:${claims.userId}:${claims.sessionId}`,
      expiresAt: '2026-01-01T00:15:00.000Z',
    };
  }
}

let container: StartedMySqlContainer | undefined;
let client: DatabaseClient | undefined;
let config: Env | undefined;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('gymnotebook_mobile_auth_test')
    .withUsername('gymnotebook')
    .withUserPassword('gymnotebook')
    .withRootPassword('root')
    .start();

  config = createTestConfig({
    DB_HOST: container.getHost(),
    DB_PORT: container.getPort(),
    DB_NAME: container.getDatabase(),
    DB_USER: container.getUsername(),
    DB_PASSWORD: container.getUserPassword(),
  });
  client = createDatabaseClient(config);
  await migrate(client.db, {
    migrationsFolder: fileURLToPath(new URL('../drizzle/migrations', import.meta.url)),
  });
  await seedRoles(client.db);
});

afterAll(async () => {
  await client?.close();
  await container?.stop();
});

describe('mobile session MySQL integration', () => {
  it('persists only refresh-token hashes and rotates with replacement links', async () => {
    const deps = makeDeps();
    const user = await createUser('mobilepersist', 'mobilepersist@example.test');

    const created = await createMobileSession(
      { user, device: { name: 'Pixel', platform: 'android' } },
      deps,
    );
    const rowsAfterCreate = await allSessions();
    expect(rowsAfterCreate).toHaveLength(1);
    expect(rowsAfterCreate[0]?.refreshTokenHash).toBe(
      deps.refreshTokens.hash(created.refreshToken),
    );
    expect(rowsAfterCreate[0]?.refreshTokenHash).not.toBe(created.refreshToken);
    expect(rowsAfterCreate[0]?.deviceName).toBe('Pixel');

    const rotated = await rotateMobileSession({ refreshToken: created.refreshToken }, deps);
    const rowsAfterRotate = await allSessions();
    expect(rowsAfterRotate).toHaveLength(2);
    const previous = rowsAfterRotate.find(
      (row) => row.refreshTokenHash === deps.refreshTokens.hash(created.refreshToken),
    );
    const current = rowsAfterRotate.find(
      (row) => row.refreshTokenHash === deps.refreshTokens.hash(rotated.refreshToken),
    );
    expect(previous?.revokedAt).not.toBeNull();
    expect(previous?.rotatedAt).not.toBeNull();
    expect(previous?.replacedBySessionRowId).toBe(current?.id);
    expect(current?.previousSessionRowId).toBe(previous?.id);
    expect(current?.sessionId).toBe(previous?.sessionId);
    expect(current?.rotatedAt).toBeNull();
  });

  it('keeps the successful replacement active after concurrent refresh replay', async () => {
    const deps = makeDeps();
    const user = await createUser('mobileconcurrent', 'mobileconcurrent@example.test');
    const created = await createMobileSession({ user }, deps);

    const results = await Promise.allSettled([
      rotateMobileSession({ refreshToken: created.refreshToken }, deps),
      rotateMobileSession({ refreshToken: created.refreshToken }, deps),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejectedReason = rejected[0]?.reason;
    if (!(rejectedReason instanceof MobileSessionError)) {
      throw new Error('Expected mobile session rejection');
    }
    expect(toExternalMobileSessionError(rejectedReason).code).toBe('invalid_mobile_session');

    const replacement = fulfilled[0]?.value;
    if (!replacement) {
      throw new Error('Expected successful replacement');
    }

    const rowsAfterConcurrent = await sessionsForUser(user.id);
    expect(rowsAfterConcurrent).toHaveLength(2);
    expect(rowsAfterConcurrent.every((row) => row.revokedAt !== null)).toBe(false);
    expect(activeLeafRows(rowsAfterConcurrent)).toHaveLength(1);
    expect(hasReplacementBranch(rowsAfterConcurrent)).toBe(false);

    await expect(
      rotateMobileSession({ refreshToken: replacement.refreshToken }, deps),
    ).resolves.toMatchObject({ refreshToken: expect.any(String) });

    const rowsAfterSecondRotation = await sessionsForUser(user.id);
    expect(activeLeafRows(rowsAfterSecondRotation)).toHaveLength(1);
    expect(hasReplacementBranch(rowsAfterSecondRotation)).toBe(false);
  });

  it('revokes the token family when a rotated token is reused after grace', async () => {
    const deps = makeDeps({
      securityEvents: {
        record: async () => {
          throw new Error('event sink failed');
        },
      },
    });
    const user = await createUser('mobilereuse', 'mobilereuse@example.test');
    const created = await createMobileSession({ user }, deps);
    const replacement = await rotateMobileSession({ refreshToken: created.refreshToken }, deps);

    deps.clock.set('2026-01-01T00:00:11.000Z');
    await expect(
      rotateMobileSession({ refreshToken: created.refreshToken }, deps),
    ).rejects.toBeInstanceOf(MobileRefreshTokenReuseError);

    expect((await sessionsForUser(user.id)).every((row) => row.revokedAt !== null)).toBe(true);
    await expect(
      rotateMobileSession({ refreshToken: replacement.refreshToken }, deps),
    ).rejects.toBeInstanceOf(MobileSessionRevokedError);
    expect((await sessionsForUser(user.id)).every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('rejects revoked and expired credentials generically at the application boundary', async () => {
    const deps = makeDeps();
    const user = await createUser('mobilereject', 'mobilereject@example.test');
    const created = await createMobileSession({ user }, deps);

    await revokeMobileSessionByRefreshToken(
      { refreshToken: created.refreshToken },
      {
        unitOfWork: deps.unitOfWork,
        refreshTokens: deps.refreshTokens,
        clock: deps.clock,
      },
    );
    await expect(
      rotateMobileSession({ refreshToken: created.refreshToken }, deps),
    ).rejects.toBeInstanceOf(MobileSessionRevokedError);

    const expiringUser = await createUser('mobileexpired', 'mobileexpired@example.test');
    const expiring = await createMobileSession({ user: expiringUser }, deps);
    deps.clock.set('2026-02-01T00:00:00.000Z');
    await expect(
      rotateMobileSession({ refreshToken: expiring.refreshToken }, deps),
    ).rejects.toBeInstanceOf(MobileSessionExpiredError);

    await expect(
      rotateMobileSession({ refreshToken: 'unknown-token-that-is-long-enough' }, deps),
    ).rejects.toBeInstanceOf(InvalidMobileSessionError);
  });

  it('deleting a user cascades sessions and listing excludes expired or revoked sessions', async () => {
    const deps = makeDeps();
    const user = await createUser('mobilelist', 'mobilelist@example.test');
    const active = await createMobileSession({ user, device: { platform: 'ios' } }, deps);
    const activeSessionId = await sessionIdForRefreshToken(active.refreshToken, deps.refreshTokens);
    const revoked = await createMobileSession({ user }, deps);
    await revokeMobileSessionByRefreshToken(
      { refreshToken: revoked.refreshToken },
      { unitOfWork: deps.unitOfWork, refreshTokens: deps.refreshTokens, clock: deps.clock },
    );

    const sessions = await listMobileSessionsForUser(
      { userId: user.id, currentSessionId: activeSessionId },
      { unitOfWork: deps.unitOfWork, clock: deps.clock },
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: activeSessionId,
      devicePlatform: 'ios',
      current: true,
    });

    await requireClient().db.delete(schema.users).where(eq(schema.users.id, user.id));
    expect((await allSessions()).filter((row) => row.userId === user.id)).toHaveLength(0);
  });

  it('cleanup preserves active rows and deletes old leaf rows safely', async () => {
    const deps = makeDeps();
    const user = await createUser('mobilecleanup', 'mobilecleanup@example.test');
    await createMobileSession({ user }, deps);
    const old = await createMobileSession({ user }, deps);
    const rotated = await rotateMobileSession({ refreshToken: old.refreshToken }, deps);
    await revokeMobileSessionByRefreshToken(
      { refreshToken: rotated.refreshToken },
      { unitOfWork: deps.unitOfWork, refreshTokens: deps.refreshTokens, clock: deps.clock },
    );
    deps.clock.set('2026-05-01T00:00:00.000Z');
    const beforeUserRows = (await allSessions()).filter((row) => row.userId === user.id).length;

    const deleted = await new DrizzleMobileSessionRepository(requireClient().db).cleanup({
      expiredBefore: '2026-01-15 00:00:00',
      revokedBefore: '2026-04-01 00:00:00',
      limit: 10,
    });

    const afterUserRows = (await allSessions()).filter((row) => row.userId === user.id);
    expect(deleted).toBeGreaterThan(0);
    expect(afterUserRows.length).toBeLessThan(beforeUserRows);
    expect(afterUserRows.some((row) => row.revokedAt === null)).toBe(true);
  });

  it('rolls back session creation when access-token issuance fails', async () => {
    const deps = makeDeps();
    deps.accessTokens.fail = true;
    const user = await createUser('mobilecreatejwtfail', 'mobilecreatejwtfail@example.test');

    await expect(createMobileSession({ user }, deps)).rejects.toThrow('access token failed');

    expect(await sessionsForUser(user.id)).toHaveLength(0);
  });

  it('rolls back rotation when access-token issuance fails and keeps old token usable', async () => {
    const deps = makeDeps();
    const user = await createUser('mobilerotatejwtfail', 'mobilerotatejwtfail@example.test');
    const created = await createMobileSession({ user }, deps);

    deps.accessTokens.fail = true;
    await expect(rotateMobileSession({ refreshToken: created.refreshToken }, deps)).rejects.toThrow(
      'access token failed',
    );

    expect(await sessionsForUser(user.id)).toHaveLength(1);
    expect(activeLeafRows(await sessionsForUser(user.id))).toHaveLength(1);

    deps.accessTokens.fail = false;
    await expect(
      rotateMobileSession({ refreshToken: created.refreshToken }, deps),
    ).resolves.toMatchObject({ refreshToken: expect.any(String) });
    expect(activeLeafRows(await sessionsForUser(user.id))).toHaveLength(1);
  });

  it('rolls back transaction work without partial token-chain rows', async () => {
    const user = await createUser('mobilerollback', 'mobilerollback@example.test');
    const refreshTokens = new CryptoRefreshTokenService(
      'integration-mobile-pepper-long-enough',
      32,
    );

    await expect(
      inTransaction(requireClient().db, async (tx) => {
        await new DrizzleMobileSessionRepository(tx).create({
          sessionId: 'rollback-session-id',
          userId: user.id,
          tokenFamilyId: 'rollback-family-id',
          refreshTokenHash: refreshTokens.hash('rollback-refresh-token'),
          previousSessionRowId: null,
          device: {},
          now: '2026-01-01 00:00:00',
          expiresAt: '2026-01-02 00:00:00',
        });
        throw new Error('rollback mobile session');
      }),
    ).rejects.toThrow('rollback mobile session');

    expect(
      (await allSessions()).filter((row) => row.sessionId === 'rollback-session-id'),
    ).toHaveLength(0);
  });
});

function makeDeps(overrides: { securityEvents?: { record(event: unknown): Promise<void> } } = {}) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  return {
    unitOfWork: new DrizzleMobileSessionUnitOfWork(requireClient().db),
    refreshTokens: new CryptoRefreshTokenService('integration-mobile-pepper-long-enough', 32),
    accessTokens: new TestAccessTokenIssuer(),
    securityEvents: overrides.securityEvents ?? { record: async () => {} },
    clock,
    refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
    refreshTokenReuseGraceMs: 10000,
    isRefreshTokenHashConflict: (error: unknown) =>
      isUniqueConstraintError(error, ['mobile_sessions_refresh_token_hash_unique']),
  };
}

async function createUser(username: string, email: string): Promise<MobileSessionUser> {
  const inserted = await requireClient()
    .db.insert(schema.users)
    .values({ username, email, password: 'hashed-password' })
    .$returningId();
  const userId = inserted[0]?.id;
  if (typeof userId !== 'number') {
    throw new Error('Expected user id');
  }
  const roleRows = await requireClient()
    .db.select()
    .from(schema.roles)
    .where(eq(schema.roles.name, 'ROLE_USER'));
  const roleId = roleRows[0]?.id;
  if (typeof roleId !== 'number') {
    throw new Error('Expected role id');
  }
  await requireClient().db.insert(schema.userRoles).values({ userId, roleId });
  return { id: userId, username, email, roles: ['ROLE_USER'] };
}

async function allSessions(): Promise<Array<typeof schema.mobileSessions.$inferSelect>> {
  return requireClient().db.select().from(schema.mobileSessions);
}

async function sessionsForUser(
  userId: number,
): Promise<Array<typeof schema.mobileSessions.$inferSelect>> {
  return (await allSessions()).filter((row) => row.userId === userId);
}

function activeLeafRows(
  rows: Array<typeof schema.mobileSessions.$inferSelect>,
): Array<typeof schema.mobileSessions.$inferSelect> {
  return rows.filter((row) => row.revokedAt === null && row.replacedBySessionRowId === null);
}

function hasReplacementBranch(rows: Array<typeof schema.mobileSessions.$inferSelect>): boolean {
  const replacementsByPreviousId = new Map<number, number>();
  for (const row of rows) {
    if (row.previousSessionRowId === null) {
      continue;
    }
    replacementsByPreviousId.set(
      row.previousSessionRowId,
      (replacementsByPreviousId.get(row.previousSessionRowId) ?? 0) + 1,
    );
  }
  return Array.from(replacementsByPreviousId.values()).some((count) => count > 1);
}

async function sessionIdForRefreshToken(
  refreshToken: string,
  refreshTokens: CryptoRefreshTokenService,
): Promise<string> {
  const hash = refreshTokens.hash(refreshToken);
  const matching = (await allSessions()).find((candidate) => candidate.refreshTokenHash === hash);
  if (!matching) {
    throw new Error('Expected session for refresh token');
  }
  return matching.sessionId;
}

function requireClient(): DatabaseClient {
  if (!client) {
    throw new Error('Database client was not initialized');
  }
  return client;
}
