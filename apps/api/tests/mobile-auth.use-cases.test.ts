import { describe, expect, it } from 'vitest'
import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
} from '../src/auth/domain/auth.errors.js'
import { cleanupMobileSessions } from '../src/mobile-auth/application/cleanup-mobile-sessions.js'
import { createMobileSession } from '../src/mobile-auth/application/create-mobile-session.js'
import { listMobileSessionsForUser } from '../src/mobile-auth/application/list-mobile-sessions.js'
import { revokeAllMobileSessionsForUser } from '../src/mobile-auth/application/revoke-all-mobile-sessions.js'
import {
  revokeMobileSessionByIdForUser,
  revokeMobileSessionByRefreshToken,
} from '../src/mobile-auth/application/revoke-mobile-session.js'
import { rotateMobileSession } from '../src/mobile-auth/application/rotate-mobile-session.js'
import { signUpMobile } from '../src/mobile-auth/application/sign-up-mobile.js'
import { validateActiveMobileSessionForUser } from '../src/mobile-auth/application/validate-active-mobile-session.js'
import type { MobileAccessTokenIssuer } from '../src/mobile-auth/domain/mobile-access-token-issuer.js'
import {
  ImmediateMobileRefreshTokenReplayError,
  InvalidMobileSessionError,
  MobileRefreshTokenReuseError,
  MobileSessionExpiredError,
  MobileSessionNotFoundError,
  MobileSessionRevokedError,
  toExternalMobileSessionError,
} from '../src/mobile-auth/domain/mobile-session.errors.js'
import type {
  MobileSessionTokenRow,
  MobileSessionUser,
} from '../src/mobile-auth/domain/mobile-session.js'
import type {
  CleanupMobileSessionsInput,
  CreateMobileSessionTokenInput,
  MobileSessionRepository,
  MobileSessionTransactionRepositories,
  MobileSessionUnitOfWork,
  RotateMobileSessionTokenInput,
} from '../src/mobile-auth/domain/mobile-session.repository.js'
import type { Clock } from '../src/mobile-auth/domain/mobile-session-time.js'
import { CryptoRefreshTokenService } from '../src/mobile-auth/infrastructure/crypto-refresh-token.service.js'
import { JwtMobileAccessTokenIssuer } from '../src/mobile-auth/infrastructure/jwt-mobile-access-token.issuer.js'
import type { ERole, Role } from '../src/users/domain/role.js'
import type { RoleRepository } from '../src/users/domain/role.repository.js'
import type { AuthenticatedUserCredentials, UserWithRoles } from '../src/users/domain/user.js'
import type { CreateUserInput, UserRepository } from '../src/users/domain/user.repository.js'

class MutableClock implements Clock {
  constructor(private value: Date) {}

  now(): Date {
    return this.value
  }

  set(value: string): void {
    this.value = new Date(value)
  }
}

class FakeAccessTokenIssuer implements MobileAccessTokenIssuer {
  issued: unknown[] = []
  fail = false

  issue(claims: Parameters<MobileAccessTokenIssuer['issue']>[0]) {
    if (this.fail) {
      throw new Error('access token failed')
    }
    this.issued.push(claims)
    return {
      token: `access:${claims.sessionId}`,
      expiresAt: '2026-01-01T00:15:00.000Z',
    }
  }
}

class FakeMobileSessionStore implements MobileSessionRepository, MobileSessionUnitOfWork {
  rows: MobileSessionTokenRow[] = []
  users = new Map<number, MobileSessionUser>()
  nextId = 1
  failNextCreate = false
  listActiveCalls = 0
  isActiveCalls = 0

  async transaction<T>(
    work: (repositories: MobileSessionTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    const snapshot = this.rows.map((row) => ({ ...row }))
    const nextId = this.nextId
    try {
      return await work({ mobileSessions: this })
    } catch (error) {
      this.rows = snapshot
      this.nextId = nextId
      throw error
    }
  }

  async create(input: CreateMobileSessionTokenInput): Promise<MobileSessionTokenRow> {
    if (this.failNextCreate) {
      throw new Error('insert failed')
    }
    const row: MobileSessionTokenRow = {
      id: this.nextId,
      sessionId: input.sessionId,
      userId: input.userId,
      tokenFamilyId: input.tokenFamilyId,
      refreshTokenHash: input.refreshTokenHash,
      previousSessionRowId: input.previousSessionRowId,
      replacedBySessionRowId: null,
      deviceName: input.device.name ?? null,
      devicePlatform: input.device.platform ?? null,
      createdAt: input.now,
      lastUsedAt: input.now,
      rotatedAt: null,
      expiresAt: input.expiresAt,
      revokedAt: null,
    }
    this.nextId += 1
    this.rows.push(row)
    return { ...row }
  }

  async findByRefreshTokenHashForUpdate(hash: string): Promise<MobileSessionTokenRow | null> {
    const row = this.rows.find((candidate) => candidate.refreshTokenHash === hash)
    return row ? { ...row } : null
  }

  async findUserForSession(userId: number): Promise<MobileSessionUser | null> {
    const user = this.users.get(userId)
    return user ? { ...user, roles: [...user.roles] } : null
  }

  async rotate(input: RotateMobileSessionTokenInput): Promise<MobileSessionTokenRow> {
    const existing = this.rows.find((row) => row.id === input.previousRow.id)
    if (!existing) {
      throw new Error('missing previous row')
    }
    const row: MobileSessionTokenRow = {
      id: this.nextId,
      sessionId: input.previousRow.sessionId,
      userId: input.previousRow.userId,
      tokenFamilyId: input.previousRow.tokenFamilyId,
      refreshTokenHash: input.refreshTokenHash,
      previousSessionRowId: input.previousRow.id,
      replacedBySessionRowId: null,
      deviceName: input.previousRow.deviceName,
      devicePlatform: input.previousRow.devicePlatform,
      createdAt: input.previousRow.createdAt,
      lastUsedAt: input.now,
      rotatedAt: null,
      expiresAt: input.expiresAt,
      revokedAt: null,
    }
    this.nextId += 1
    this.rows.push(row)
    existing.replacedBySessionRowId = row.id
    existing.rotatedAt = input.now
    existing.revokedAt = input.now
    existing.lastUsedAt = input.now
    return { ...row }
  }

  async revokeTokenFamily(tokenFamilyId: string, now: string): Promise<number> {
    const matches = this.rows.filter((row) => row.tokenFamilyId === tokenFamilyId)
    for (const row of matches) {
      row.revokedAt = now
      row.lastUsedAt = now
    }
    return matches.length
  }

  async revokeByRefreshTokenHash(hash: string, now: string): Promise<void> {
    const row = this.rows.find((candidate) => candidate.refreshTokenHash === hash)
    if (row) {
      await this.revokeTokenFamily(row.tokenFamilyId, now)
    }
  }

  async revokeBySessionIdForUser(input: {
    userId: number
    sessionId: string
    now: string
  }): Promise<number> {
    const matches = this.rows.filter(
      (row) => row.userId === input.userId && row.sessionId === input.sessionId,
    )
    for (const row of matches) {
      row.revokedAt = input.now
      row.lastUsedAt = input.now
    }
    return matches.length
  }

  async revokeAllForUser(input: {
    userId: number
    now: string
    exceptSessionId?: string
  }): Promise<number> {
    const matches = this.rows.filter(
      (row) => row.userId === input.userId && row.sessionId !== input.exceptSessionId,
    )
    for (const row of matches) {
      row.revokedAt = input.now
      row.lastUsedAt = input.now
    }
    return matches.length
  }

  async listActiveByUser(input: { userId: number; now: string; currentSessionId?: string }) {
    this.listActiveCalls += 1
    return this.rows
      .filter(
        (row) =>
          row.userId === input.userId &&
          row.revokedAt === null &&
          row.replacedBySessionRowId === null &&
          row.expiresAt > input.now,
      )
      .map((row) => ({
        id: row.sessionId,
        deviceName: row.deviceName,
        devicePlatform: row.devicePlatform,
        createdAt: row.createdAt,
        lastUsedAt: row.lastUsedAt,
        expiresAt: row.expiresAt,
        current: row.sessionId === input.currentSessionId,
      }))
  }

  async isActiveSessionForUser(input: {
    userId: number
    sessionId: string
    now: string
  }): Promise<boolean> {
    this.isActiveCalls += 1
    return this.rows.some(
      (row) =>
        row.userId === input.userId &&
        row.sessionId === input.sessionId &&
        row.revokedAt === null &&
        row.replacedBySessionRowId === null &&
        row.expiresAt > input.now,
    )
  }

  async cleanup(input: CleanupMobileSessionsInput): Promise<number> {
    const deletable = this.rows.filter((row) => {
      const retained =
        row.expiresAt >= input.expiredBefore &&
        (row.revokedAt === null || row.revokedAt >= input.revokedBefore)
      const hasChild = this.rows.some((child) => child.previousSessionRowId === row.id)
      return !retained && !hasChild
    })
    const ids = deletable.slice(0, input.limit).map((row) => row.id)
    this.rows = this.rows.filter((row) => !ids.includes(row.id))
    return ids.length
  }
}

class FakeSignupUsers implements UserRepository {
  users: Array<{ id: number; username: string; email: string; passwordHash: string }> = []
  assignedRoles: Array<{ userId: number; roleId: number }> = []
  nextId = 1

  async findCredentialsByUsername(username: string): Promise<AuthenticatedUserCredentials | null> {
    const user = this.users.find((candidate) => candidate.username === username)
    return user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          roles: ['ROLE_USER'],
        }
      : null
  }

  async findById(id: number): Promise<UserWithRoles | null> {
    const user = this.users.find((candidate) => candidate.id === id)
    return user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: [{ id: 1, name: 'ROLE_USER' }],
        }
      : null
  }

  async findAll(): Promise<UserWithRoles[]> {
    return this.users.map((candidate) => ({
      id: candidate.id,
      username: candidate.username,
      email: candidate.email,
      roles: [{ id: 1, name: 'ROLE_USER' }],
    }))
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.users.some((candidate) => candidate.username === username)
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.users.some((candidate) => candidate.email === email)
  }

  async existsById(id: number): Promise<boolean> {
    return this.users.some((candidate) => candidate.id === id)
  }

  async createUser(input: CreateUserInput): Promise<number> {
    const id = this.nextId
    this.nextId += 1
    this.users.push({ id, ...input })
    return id
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
    const user = this.users.find((candidate) => candidate.id === userId)
    if (user) {
      user.passwordHash = passwordHash
    }
  }

  async assignRole(userId: number, roleId: number): Promise<void> {
    this.assignedRoles.push({ userId, roleId })
  }

  async removeRole(userId: number, roleId: number): Promise<void> {
    this.assignedRoles = this.assignedRoles.filter(
      (assigned) => assigned.userId !== userId || assigned.roleId !== roleId,
    )
  }

  async hasRole(userId: number, role: ERole): Promise<boolean> {
    return role === 'ROLE_USER' && this.assignedRoles.some((assigned) => assigned.userId === userId)
  }

  async countUsersByRole(role: ERole): Promise<number> {
    return role === 'ROLE_USER' ? this.assignedRoles.length : 0
  }

  async countUsersByRoleForUpdate(role: ERole): Promise<number> {
    return this.countUsersByRole(role)
  }

  async deleteById(id: number): Promise<void> {
    this.users = this.users.filter((candidate) => candidate.id !== id)
    this.assignedRoles = this.assignedRoles.filter((assigned) => assigned.userId !== id)
  }

  snapshot(): {
    users: FakeSignupUsers['users']
    assignedRoles: FakeSignupUsers['assignedRoles']
    nextId: number
  } {
    return {
      users: this.users.map((candidate) => ({ ...candidate })),
      assignedRoles: this.assignedRoles.map((assigned) => ({ ...assigned })),
      nextId: this.nextId,
    }
  }

  restore(snapshot: ReturnType<FakeSignupUsers['snapshot']>): void {
    this.users = snapshot.users.map((candidate) => ({ ...candidate }))
    this.assignedRoles = snapshot.assignedRoles.map((assigned) => ({ ...assigned }))
    this.nextId = snapshot.nextId
  }
}

class FakeSignupRoles implements RoleRepository {
  role: Role | null = { id: 1, name: 'ROLE_USER' }

  async findByName(name: ERole): Promise<Role | null> {
    return this.role?.name === name ? this.role : null
  }

  async findById(id: number): Promise<Role | null> {
    return this.role?.id === id ? this.role : null
  }
}

const user: MobileSessionUser = {
  id: 1,
  username: 'mobileuser',
  email: 'mobile@example.test',
  roles: ['ROLE_USER'],
}

function makeDeps() {
  const store = new FakeMobileSessionStore()
  store.users.set(user.id, user)
  const clock = new MutableClock(new Date('2026-01-01T00:00:00.000Z'))
  const refreshTokens = new CryptoRefreshTokenService('test-pepper-that-is-long-enough', 32)
  const accessTokens = new FakeAccessTokenIssuer()
  return { store, clock, refreshTokens, accessTokens }
}

describe('mobile refresh-token crypto', () => {
  it('generates distinct base64url tokens with expected entropy and hashes deterministically', () => {
    const service = new CryptoRefreshTokenService('pepper-one-that-is-long-enough', 64)
    const otherPepper = new CryptoRefreshTokenService('pepper-two-that-is-long-enough', 64)
    const first = service.generate()
    const second = service.generate()

    expect(first).not.toBe(second)
    expect(first).toHaveLength(86)
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(service.hash(first)).toBe(service.hash(first))
    expect(service.hash(first)).not.toBe(service.hash(second))
    expect(service.hash(first)).not.toBe(otherPepper.hash(first))
    expect(service.equals(service.hash(first), service.hash(first))).toBe(true)
  })
})

describe('mobile session use cases', () => {
  it('creates a session with hashed refresh credential and mobile access claims', async () => {
    const deps = makeDeps()

    const result = await createMobileSession(
      { user, device: { name: 'Pixel', platform: 'android' } },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    expect(result.refreshToken).toBeTruthy()
    expect(deps.store.rows[0]?.refreshTokenHash).toBe(deps.refreshTokens.hash(result.refreshToken))
    expect(deps.store.rows[0]?.refreshTokenHash).not.toBe(result.refreshToken)
    expect(result.accessToken).toBe(`access:${deps.store.rows[0]?.sessionId}`)
    expect(deps.accessTokens.issued[0]).toMatchObject({ sessionId: deps.store.rows[0]?.sessionId })
  })

  it('rolls back partial session creation failures', async () => {
    const deps = makeDeps()
    deps.store.failNextCreate = true

    await expect(
      createMobileSession(
        { user },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          clock: deps.clock,
          refreshTokenTtlMs: 1000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toThrow('insert failed')

    expect(deps.store.rows).toEqual([])
  })

  it('rolls back session creation when access-token issuance fails', async () => {
    const deps = makeDeps()
    deps.accessTokens.fail = true

    await expect(
      createMobileSession(
        { user },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          clock: deps.clock,
          refreshTokenTtlMs: 1000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toThrow('access token failed')

    expect(deps.store.rows).toEqual([])
  })

  it('signs up a mobile user, assigns ROLE_USER and creates the first session atomically', async () => {
    const deps = makeDeps()
    const users = new FakeSignupUsers()
    const roles = new FakeSignupRoles()

    const result = await signUpMobile(
      {
        username: 'newmobile',
        email: 'newmobile@example.test',
        password: 'secret1',
        device: { platform: 'ios' },
      },
      {
        passwordHasher: { hash: async (password) => `hashed:${password}` },
        transaction: (work) =>
          deps.store.transaction(async ({ mobileSessions }) =>
            work({ users, roles, mobileSessions }),
          ),
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isDuplicateUsernameError: () => false,
        isDuplicateEmailError: () => false,
        isRefreshTokenHashConflict: () => false,
      },
    )

    expect(result.user).toMatchObject({
      username: 'newmobile',
      email: 'newmobile@example.test',
      roles: ['ROLE_USER'],
    })
    expect(users.users).toHaveLength(1)
    expect(users.users[0]?.passwordHash).toBe('hashed:secret1')
    expect(users.assignedRoles).toEqual([{ userId: 1, roleId: 1 }])
    expect(deps.store.rows).toHaveLength(1)
    expect(deps.store.rows[0]?.devicePlatform).toBe('ios')
  })

  it('rejects duplicate mobile signup values without creating sessions', async () => {
    const deps = makeDeps()
    const users = new FakeSignupUsers()
    await users.createUser({
      username: 'duplicate',
      email: 'duplicate@example.test',
      passwordHash: 'hash',
    })
    const roles = new FakeSignupRoles()

    await expect(
      signUpMobile(
        {
          username: 'duplicate',
          email: 'new@example.test',
          password: 'secret1',
        },
        {
          passwordHasher: { hash: async (password) => `hashed:${password}` },
          transaction: (work) =>
            deps.store.transaction(async ({ mobileSessions }) =>
              work({ users, roles, mobileSessions }),
            ),
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          isDuplicateUsernameError: () => false,
          isDuplicateEmailError: () => false,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError)

    await expect(
      signUpMobile(
        {
          username: 'newmobile',
          email: 'duplicate@example.test',
          password: 'secret1',
        },
        {
          passwordHasher: { hash: async (password) => `hashed:${password}` },
          transaction: (work) =>
            deps.store.transaction(async ({ mobileSessions }) =>
              work({ users, roles, mobileSessions }),
            ),
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          isDuplicateUsernameError: () => false,
          isDuplicateEmailError: () => false,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError)

    expect(deps.store.rows).toEqual([])
  })

  it('rolls back mobile signup user and session work when token issuance fails', async () => {
    const deps = makeDeps()
    const users = new FakeSignupUsers()
    const roles = new FakeSignupRoles()
    deps.accessTokens.fail = true

    await expect(
      signUpMobile(
        {
          username: 'rollbackmobile',
          email: 'rollbackmobile@example.test',
          password: 'secret1',
        },
        {
          passwordHasher: { hash: async (password) => `hashed:${password}` },
          transaction: async (work) => {
            const userSnapshot = users.snapshot()
            return deps.store.transaction(async ({ mobileSessions }) => {
              try {
                return await work({ users, roles, mobileSessions })
              } catch (error) {
                users.restore(userSnapshot)
                throw error
              }
            })
          },
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          isDuplicateUsernameError: () => false,
          isDuplicateEmailError: () => false,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toThrow('access token failed')

    expect(users.users).toEqual([])
    expect(users.assignedRoles).toEqual([])
    expect(deps.store.rows).toEqual([])
  })

  it('rotates refresh tokens, tolerates immediate replay, and revokes delayed reuse', async () => {
    const deps = makeDeps()
    const created = await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    const rotated = await rotateMobileSession(
      { refreshToken: created.refreshToken },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        securityEvents: { record: async () => {} },
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        refreshTokenReuseGraceMs: 10000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    expect(rotated.refreshToken).not.toBe(created.refreshToken)
    expect(deps.store.rows).toHaveLength(2)
    expect(deps.store.rows[0]?.replacedBySessionRowId).toBe(deps.store.rows[1]?.id)

    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(ImmediateMobileRefreshTokenReplayError)
    expect(deps.store.rows.some((row) => row.revokedAt === null)).toBe(true)

    deps.clock.set('2026-01-01T00:00:11.000Z')
    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(MobileRefreshTokenReuseError)
    expect(deps.store.rows.every((row) => row.revokedAt !== null)).toBe(true)
  })

  it('rejects missing, revoked and expired refresh credentials', async () => {
    const deps = makeDeps()
    const created = await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 1000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    await expect(
      rotateMobileSession(
        { refreshToken: 'unknown-token-that-is-long-enough' },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 1000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(InvalidMobileSessionError)

    const row = deps.store.rows[0]
    if (!row) {
      throw new Error('Expected created session row')
    }
    row.revokedAt = '2026-01-01 00:00:01'
    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 1000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(MobileSessionRevokedError)

    const restoredRow = deps.store.rows[0]
    if (!restoredRow) {
      throw new Error('Expected restored session row')
    }
    restoredRow.revokedAt = null
    deps.clock.set('2026-01-01T00:00:02.000Z')
    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 1000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(MobileSessionExpiredError)
  })

  it('rolls back rotation when access-token issuance fails', async () => {
    const deps = makeDeps()
    const created = await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    deps.accessTokens.fail = true
    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toThrow('access token failed')

    expect(deps.store.rows).toHaveLength(1)
    expect(deps.store.rows[0]).toMatchObject({
      replacedBySessionRowId: null,
      rotatedAt: null,
      revokedAt: null,
    })

    deps.accessTokens.fail = false
    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: { record: async () => {} },
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).resolves.toMatchObject({ accessToken: expect.stringContaining('access:') })
  })

  it('keeps committed family revocation when security-event recording fails', async () => {
    const deps = makeDeps()
    const created = await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )
    await rotateMobileSession(
      { refreshToken: created.refreshToken },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        securityEvents: { record: async () => {} },
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        refreshTokenReuseGraceMs: 10000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    deps.clock.set('2026-01-01T00:00:11.000Z')
    await expect(
      rotateMobileSession(
        { refreshToken: created.refreshToken },
        {
          unitOfWork: deps.store,
          refreshTokens: deps.refreshTokens,
          accessTokens: deps.accessTokens,
          securityEvents: {
            record: async () => {
              throw new Error('event sink failed')
            },
          },
          clock: deps.clock,
          refreshTokenTtlMs: 100000,
          refreshTokenReuseGraceMs: 10000,
          isRefreshTokenHashConflict: () => false,
        },
      ),
    ).rejects.toBeInstanceOf(MobileRefreshTokenReuseError)

    expect(deps.store.rows.every((row) => row.revokedAt !== null)).toBe(true)
  })

  it('lists active owned sessions and supports revoke-one, revoke-all and cleanup', async () => {
    const deps = makeDeps()
    const first = await createMobileSession(
      { user, device: { platform: 'ios' } },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )
    const firstSessionId = deps.store.rows[0]?.sessionId ?? ''
    await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )

    await revokeMobileSessionByRefreshToken(
      { refreshToken: first.refreshToken },
      { unitOfWork: deps.store, refreshTokens: deps.refreshTokens, clock: deps.clock },
    )
    expect(
      await listMobileSessionsForUser(
        { userId: user.id, currentSessionId: firstSessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).toHaveLength(1)

    await expect(
      revokeMobileSessionByIdForUser(
        { userId: 999, sessionId: firstSessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).rejects.toBeInstanceOf(MobileSessionNotFoundError)

    const revoked = await revokeAllMobileSessionsForUser(
      { userId: user.id, exceptSessionId: firstSessionId },
      { unitOfWork: deps.store, clock: deps.clock },
    )
    expect(revoked).toBe(1)

    deps.clock.set('2026-04-01T00:00:00.000Z')
    await expect(
      cleanupMobileSessions(
        { limit: 10 },
        { unitOfWork: deps.store, clock: deps.clock, retentionMs: 1 },
      ),
    ).resolves.toBe(2)
    expect(deps.store.rows).toEqual([])
  })

  it('validates one active mobile session without listing all sessions', async () => {
    const deps = makeDeps()
    await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )
    const sessionId = deps.store.rows[0]?.sessionId
    if (!sessionId) {
      throw new Error('Expected created session id')
    }

    await expect(
      validateActiveMobileSessionForUser(
        { userId: user.id, sessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).resolves.toBeUndefined()
    expect(deps.store.isActiveCalls).toBe(1)
    expect(deps.store.listActiveCalls).toBe(0)
  })

  it('rejects foreign, expired, revoked and replaced active-session validation', async () => {
    const deps = makeDeps()
    const created = await createMobileSession(
      { user },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        isRefreshTokenHashConflict: () => false,
      },
    )
    const sessionId = deps.store.rows[0]?.sessionId
    if (!sessionId) {
      throw new Error('Expected created session id')
    }

    await expect(
      validateActiveMobileSessionForUser(
        { userId: 999, sessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).rejects.toBeInstanceOf(InvalidMobileSessionError)

    const row = deps.store.rows[0]
    if (!row) {
      throw new Error('Expected created session row')
    }
    row.revokedAt = '2026-01-01 00:00:01'
    await expect(
      validateActiveMobileSessionForUser(
        { userId: user.id, sessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).rejects.toBeInstanceOf(InvalidMobileSessionError)

    row.revokedAt = null
    row.expiresAt = '2025-12-31 23:59:59'
    await expect(
      validateActiveMobileSessionForUser(
        { userId: user.id, sessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).rejects.toBeInstanceOf(InvalidMobileSessionError)

    row.expiresAt = '2026-01-01 00:01:40'
    await rotateMobileSession(
      { refreshToken: created.refreshToken },
      {
        unitOfWork: deps.store,
        refreshTokens: deps.refreshTokens,
        accessTokens: deps.accessTokens,
        securityEvents: { record: async () => {} },
        clock: deps.clock,
        refreshTokenTtlMs: 100000,
        refreshTokenReuseGraceMs: 10000,
        isRefreshTokenHashConflict: () => false,
      },
    )
    await expect(
      validateActiveMobileSessionForUser(
        { userId: user.id, sessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).resolves.toBeUndefined()

    const previousRow = deps.store.rows[0]
    if (!previousRow) {
      throw new Error('Expected previous session row')
    }
    previousRow.sessionId = 'previous-version-session-id'
    await expect(
      validateActiveMobileSessionForUser(
        { userId: user.id, sessionId: previousRow.sessionId },
        { unitOfWork: deps.store, clock: deps.clock },
      ),
    ).rejects.toBeInstanceOf(InvalidMobileSessionError)
  })

  it('maps sensitive internal session errors to one generic external error', () => {
    const mapped = toExternalMobileSessionError(new MobileRefreshTokenReuseError())
    expect(mapped).toBeInstanceOf(InvalidMobileSessionError)
    expect(mapped.code).toBe('invalid_mobile_session')
  })

  it('issues JWT access tokens with mobile session id and TTL override', () => {
    const issuer = new JwtMobileAccessTokenIssuer(
      (payload, options) => `${payload.sessionId}:${options.expiresIn}`,
      900000,
      () => new Date('2026-01-01T00:00:00.000Z'),
    )

    expect(
      issuer.issue({ sub: 'u', userId: 1, roles: ['ROLE_USER'], sessionId: 'session-1' }),
    ).toEqual({
      token: 'session-1:900',
      expiresAt: '2026-01-01T00:15:00.000Z',
    })
  })
})
