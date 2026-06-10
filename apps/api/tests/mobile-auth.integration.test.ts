import { fileURLToPath } from 'node:url';
import type { MobileTokenPairResponse } from '@gymnotebook/contracts';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../drizzle/schema.js';
import { seedRoles } from '../scripts/seed-roles.js';
import { buildApp, createTestConfig } from '../src/app.js';
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
let app: FastifyInstance | undefined;

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
  app = await buildApp({ config, databaseClient: client });
});

afterAll(async () => {
  await app?.close();
  if (!app) {
    await client?.close();
  }
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

  it('runs the complete mobile HTTP signup, refresh, replay, listing, and revocation flow', async () => {
    const signup = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signup',
      payload: {
        username: 'httpmobileone',
        email: 'httpmobileone@example.test',
        password: 'secret1',
        device: { name: 'Pixel', platform: 'android' },
      },
    });
    expect(signup.statusCode).toBe(201);
    expect(signup.body.refreshToken).toEqual(expect.any(String));

    const protectedRead = await injectJson({
      method: 'GET',
      url: '/api/user/me',
      headers: bearer(signup.body.accessToken),
    });
    expect(protectedRead.statusCode).toBe(200);

    const firstRefresh = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/refresh',
      payload: { refreshToken: signup.body.refreshToken },
    });
    expect(firstRefresh.statusCode).toBe(200);
    expect(firstRefresh.body.refreshToken).not.toBe(signup.body.refreshToken);

    const immediateReplay = await injectJson({
      method: 'POST',
      url: '/api/auth/mobile/refresh',
      payload: { refreshToken: signup.body.refreshToken },
    });
    expect(immediateReplay.statusCode).toBe(401);
    expect(immediateReplay.body).toMatchObject({ code: 'invalid_mobile_session' });

    const stillUsable = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/refresh',
      payload: { refreshToken: firstRefresh.body.refreshToken },
    });
    expect(stillUsable.statusCode).toBe(200);

    const secondSignin = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signin',
      payload: {
        username: 'httpmobileone',
        password: 'secret1',
        device: { name: 'iPhone', platform: 'ios' },
      },
    });
    expect(secondSignin.statusCode).toBe(200);

    const sessions = await injectJson<{
      sessions: Array<{ id: string; current: boolean; devicePlatform: 'android' | 'ios' | null }>;
    }>({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(sessions.statusCode).toBe(200);
    expect(sessions.body.sessions).toHaveLength(2);
    expect(sessions.body.sessions.filter((session) => session.current)).toHaveLength(1);
    const otherSession = sessions.body.sessions.find((session) => !session.current);
    if (!otherSession) {
      throw new Error('Expected another mobile session');
    }

    const revokeOther = await injectJson({
      method: 'DELETE',
      url: `/api/auth/mobile/sessions/${otherSession.id}`,
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(revokeOther.statusCode).toBe(204);

    const foreignSignup = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signup',
      payload: {
        username: 'httpmobiletwo',
        email: 'httpmobiletwo@example.test',
        password: 'secret1',
      },
    });
    expect(foreignSignup.statusCode).toBe(201);
    const foreignSessions = await injectJson<{ sessions: Array<{ id: string }> }>({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(foreignSignup.body.accessToken),
    });
    const foreignSessionId = foreignSessions.body.sessions[0]?.id;
    if (!foreignSessionId) {
      throw new Error('Expected foreign session');
    }

    const revokeForeign = await injectJson({
      method: 'DELETE',
      url: `/api/auth/mobile/sessions/${foreignSessionId}`,
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(revokeForeign.statusCode).toBe(404);
    expect(revokeForeign.body).toMatchObject({ code: 'mobile_session_not_found' });

    const revokeAllKeepCurrent = await injectJson<{ revoked: number }>({
      method: 'DELETE',
      url: '/api/auth/mobile/sessions?keepCurrent=true',
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(revokeAllKeepCurrent.statusCode).toBe(200);
    expect(revokeAllKeepCurrent.body.revoked).toBeGreaterThanOrEqual(0);

    const currentStillActive = await injectJson<{ sessions: Array<{ current: boolean }> }>({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(currentStillActive.statusCode).toBe(200);
    expect(currentStillActive.body.sessions).toHaveLength(1);
    expect(currentStillActive.body.sessions[0]?.current).toBe(true);

    const revokeAll = await injectJson<{ revoked: number }>({
      method: 'DELETE',
      url: '/api/auth/mobile/sessions',
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(revokeAll.statusCode).toBe(200);
    expect(revokeAll.body.revoked).toBeGreaterThan(0);

    const revokedAccessToken = await injectJson({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(stillUsable.body.accessToken),
    });
    expect(revokedAccessToken.statusCode).toBe(401);
    expect(revokedAccessToken.body).toMatchObject({ code: 'invalid_mobile_session' });
  });

  it('validates mobile session-management access with a bounded active-session lookup', async () => {
    const active = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signup',
      payload: {
        username: 'httpactivecheck',
        email: 'httpactivecheck@example.test',
        password: 'secret1',
      },
    });
    expect(active.statusCode).toBe(201);
    const activeSessionId = await firstListedSessionId(active.body.accessToken);

    const activeList = await injectJson({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(active.body.accessToken),
    });
    expect(activeList.statusCode).toBe(200);

    const foreign = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signup',
      payload: {
        username: 'httpforeigncheck',
        email: 'httpforeigncheck@example.test',
        password: 'secret1',
      },
    });
    expect(foreign.statusCode).toBe(201);
    const foreignSessionId = await firstListedSessionId(foreign.body.accessToken);
    const foreignSessionToken = signMobileAccessToken({
      userId: active.body.user.id,
      username: active.body.user.username,
      sessionId: foreignSessionId,
    });
    const foreignResponse = await injectJson({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(foreignSessionToken),
    });
    expect(foreignResponse.statusCode).toBe(401);
    expect(foreignResponse.body).toMatchObject({ code: 'invalid_mobile_session' });

    await requireClient()
      .db.update(schema.mobileSessions)
      .set({ expiresAt: '2025-12-31 23:59:59' })
      .where(eq(schema.mobileSessions.sessionId, activeSessionId));
    const expiredResponse = await injectJson({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(active.body.accessToken),
    });
    expect(expiredResponse.statusCode).toBe(401);
    expect(expiredResponse.body).toMatchObject({ code: 'invalid_mobile_session' });

    const revoked = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signup',
      payload: {
        username: 'httprevokedcheck',
        email: 'httprevokedcheck@example.test',
        password: 'secret1',
      },
    });
    expect(revoked.statusCode).toBe(201);
    const revokedSessionId = await firstListedSessionId(revoked.body.accessToken);
    await requireClient()
      .db.update(schema.mobileSessions)
      .set({ revokedAt: '2026-01-01 00:00:00' })
      .where(eq(schema.mobileSessions.sessionId, revokedSessionId));
    const revokedResponse = await injectJson({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(revoked.body.accessToken),
    });
    expect(revokedResponse.statusCode).toBe(401);
    expect(revokedResponse.body).toMatchObject({ code: 'invalid_mobile_session' });

    const replacedUser = await createUser('httpreplacedcheck', 'httpreplacedcheck@example.test');
    const replacedSessionId = 'replaced-session-id-that-is-long-enough';
    const previous = await requireClient()
      .db.insert(schema.mobileSessions)
      .values({
        sessionId: replacedSessionId,
        userId: replacedUser.id,
        tokenFamilyId: 'replaced-family-id-that-is-long-enough',
        refreshTokenHash: 'replaced-hash-old',
        previousSessionRowId: null,
        deviceName: null,
        devicePlatform: null,
        createdAt: '2026-01-01 00:00:00',
        lastUsedAt: '2026-01-01 00:00:00',
        rotatedAt: '2026-01-01 00:01:00',
        expiresAt: '2026-02-01 00:00:00',
        revokedAt: '2026-01-01 00:01:00',
      })
      .$returningId();
    const previousId = previous[0]?.id;
    if (typeof previousId !== 'number') {
      throw new Error('Expected replaced previous row id');
    }
    const replacement = await requireClient()
      .db.insert(schema.mobileSessions)
      .values({
        sessionId: 'replacement-session-id-that-is-long-enough',
        userId: replacedUser.id,
        tokenFamilyId: 'replaced-family-id-that-is-long-enough',
        refreshTokenHash: 'replaced-hash-new',
        previousSessionRowId: previousId,
        deviceName: null,
        devicePlatform: null,
        createdAt: '2026-01-01 00:00:00',
        lastUsedAt: '2026-01-01 00:01:00',
        rotatedAt: null,
        expiresAt: '2026-02-01 00:00:00',
        revokedAt: null,
      })
      .$returningId();
    const replacementId = replacement[0]?.id;
    if (typeof replacementId !== 'number') {
      throw new Error('Expected replacement row id');
    }
    await requireClient()
      .db.update(schema.mobileSessions)
      .set({ replacedBySessionRowId: replacementId })
      .where(eq(schema.mobileSessions.id, previousId));

    const replacedToken = signMobileAccessToken({
      userId: replacedUser.id,
      username: replacedUser.username,
      sessionId: replacedSessionId,
    });
    const replacedResponse = await injectJson({
      method: 'GET',
      url: '/api/auth/mobile/sessions',
      headers: bearer(replacedToken),
    });
    expect(replacedResponse.statusCode).toBe(401);
    expect(replacedResponse.body).toMatchObject({ code: 'invalid_mobile_session' });
  });

  it('keeps the successful HTTP refresh replacement active after concurrent replay', async () => {
    const signup = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/signup',
      payload: {
        username: 'httpconcurrent',
        email: 'httpconcurrent@example.test',
        password: 'secret1',
      },
    });
    expect(signup.statusCode).toBe(201);

    const results = await Promise.all([
      injectJson<MobileTokenPairResponse>({
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: signup.body.refreshToken },
      }),
      injectJson<MobileTokenPairResponse>({
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: signup.body.refreshToken },
      }),
    ]);

    const successful = results.filter((response) => response.statusCode === 200);
    const failed = results.filter((response) => response.statusCode === 401);
    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.body).toMatchObject({ code: 'invalid_mobile_session' });

    const replacement = successful[0]?.body;
    if (!replacement) {
      throw new Error('Expected successful replacement');
    }
    const replacementRefresh = await injectJson<MobileTokenPairResponse>({
      method: 'POST',
      url: '/api/auth/mobile/refresh',
      payload: { refreshToken: replacement.refreshToken },
    });
    expect(replacementRefresh.statusCode).toBe(200);

    const rows = await sessionsForUser(signup.body.user.id);
    expect(activeLeafRows(rows)).toHaveLength(1);
    expect(hasReplacementBranch(rows)).toBe(false);
  });

  it('normalizes delayed HTTP refresh-token reuse and commits family revocation', async () => {
    const localConfig = createTestConfig({
      DB_HOST: requireConfig().DB_HOST,
      DB_PORT: requireConfig().DB_PORT,
      DB_NAME: requireConfig().DB_NAME,
      DB_USER: requireConfig().DB_USER,
      DB_PASSWORD: requireConfig().DB_PASSWORD,
      MOBILE_REFRESH_TOKEN_REUSE_GRACE_MS: 0,
    });
    const localClient = createDatabaseClient(localConfig);
    const localApp = await buildApp({ config: localConfig, databaseClient: localClient });
    try {
      const signup = await injectJsonWithApp<MobileTokenPairResponse>(localApp, {
        method: 'POST',
        url: '/api/auth/mobile/signup',
        payload: {
          username: 'httpreuse',
          email: 'httpreuse@example.test',
          password: 'secret1',
        },
      });
      expect(signup.statusCode).toBe(201);

      const replacement = await injectJsonWithApp<MobileTokenPairResponse>(localApp, {
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: signup.body.refreshToken },
      });
      expect(replacement.statusCode).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const reuse = await injectJsonWithApp(localApp, {
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: signup.body.refreshToken },
      });
      expect(reuse.statusCode).toBe(401);
      expect(reuse.body).toMatchObject({ code: 'invalid_mobile_session' });

      const replacementAfterReuse = await injectJsonWithApp(localApp, {
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: replacement.body.refreshToken },
      });
      expect(replacementAfterReuse.statusCode).toBe(401);
      expect(replacementAfterReuse.body).toMatchObject({ code: 'invalid_mobile_session' });
      expect(
        (await sessionsForUser(signup.body.user.id)).every((row) => row.revokedAt !== null),
      ).toBe(true);
    } finally {
      await localApp.close();
    }
  });

  it('applies the dedicated auth rate limit to mobile refresh', async () => {
    const localConfig = createTestConfig({
      DB_HOST: requireConfig().DB_HOST,
      DB_PORT: requireConfig().DB_PORT,
      DB_NAME: requireConfig().DB_NAME,
      DB_USER: requireConfig().DB_USER,
      DB_PASSWORD: requireConfig().DB_PASSWORD,
      AUTH_RATE_LIMIT_MAX: 1,
      AUTH_RATE_LIMIT_WINDOW_MS: 60000,
    });
    const localClient = createDatabaseClient(localConfig);
    const localApp = await buildApp({ config: localConfig, databaseClient: localClient });
    try {
      const first = await injectJsonWithApp(localApp, {
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: 'a'.repeat(64) },
      });
      const second = await injectJsonWithApp(localApp, {
        method: 'POST',
        url: '/api/auth/mobile/refresh',
        payload: { refreshToken: 'b'.repeat(64) },
      });

      expect(first.statusCode).toBe(401);
      expect(first.body).toMatchObject({ code: 'invalid_mobile_session' });
      expect(second.statusCode).toBe(429);
    } finally {
      await localApp.close();
    }
  });

  it('keeps existing web auth responses unchanged', async () => {
    const webSignup = await injectJson({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        username: 'webcompat',
        email: 'webcompat@example.test',
        password: 'secret1',
      },
    });
    expect(webSignup.statusCode).toBe(201);
    expect(webSignup.body).toEqual({ message: '¡Usuario registrado correctamente!' });

    const webSignin = await injectJson({
      method: 'POST',
      url: '/api/auth/signin',
      payload: { username: 'webcompat', password: 'secret1' },
    });
    expect(webSignin.statusCode).toBe(200);
    expect(webSignin.body).toMatchObject({
      type: 'Bearer',
      username: 'webcompat',
      email: 'webcompat@example.test',
      roles: ['ROLE_USER'],
    });
    expect(webSignin.body).not.toHaveProperty('refreshToken');
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

function requireConfig(): Env {
  if (!config) {
    throw new Error('Config was not initialized');
  }
  return config;
}

function requireApp(): FastifyInstance {
  if (!app) {
    throw new Error('App was not initialized');
  }
  return app;
}

function bearer(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

function signMobileAccessToken(input: {
  userId: number;
  username: string;
  sessionId: string;
}): string {
  return requireApp().jwt.sign({
    sub: input.username,
    userId: input.userId,
    roles: ['ROLE_USER'],
    sessionId: input.sessionId,
  });
}

async function firstListedSessionId(accessToken: string): Promise<string> {
  const response = await injectJson<{ sessions: Array<{ id: string }> }>({
    method: 'GET',
    url: '/api/auth/mobile/sessions',
    headers: bearer(accessToken),
  });
  const sessionId = response.body.sessions[0]?.id;
  if (!sessionId) {
    throw new Error('Expected listed mobile session');
  }
  return sessionId;
}

async function injectJson<TBody = Record<string, unknown>>(
  request: Parameters<FastifyInstance['inject']>[0],
): Promise<{ statusCode: number; body: TBody }> {
  return injectJsonWithApp(requireApp(), request);
}

async function injectJsonWithApp<TBody = Record<string, unknown>>(
  instance: FastifyInstance,
  request: Parameters<FastifyInstance['inject']>[0],
): Promise<{ statusCode: number; body: TBody }> {
  const response = await instance.inject(request);
  return {
    statusCode: response.statusCode,
    body: response.body.length > 0 ? response.json<TBody>() : ({} as TBody),
  };
}
