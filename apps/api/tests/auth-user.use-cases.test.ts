import type { ERole, SignupRequest } from '@gymnotebook/contracts'
import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { signIn } from '../src/auth/application/sign-in.js'
import { type SignUpTransactionRepositories, signUp } from '../src/auth/application/sign-up.js'
import {
  DefaultRoleNotFoundError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UsernameAlreadyExistsError,
} from '../src/auth/domain/auth.errors.js'
import { Argon2PasswordHasher } from '../src/auth/infrastructure/argon2-password-hasher.js'
import { assignRole } from '../src/users/application/assign-role.js'
import { deleteUser } from '../src/users/application/delete-user.js'
import { getCurrentUser } from '../src/users/application/get-current-user.js'
import { listUsers } from '../src/users/application/list-users.js'
import { removeRole } from '../src/users/application/remove-role.js'
import { verifyUserAvailability } from '../src/users/application/verify-user-availability.js'
import type { Role } from '../src/users/domain/role.js'
import type { RoleRepository } from '../src/users/domain/role.repository.js'
import {
  CannotDeleteLastAdminError,
  CannotDeleteSelfError,
  RoleAlreadyAssignedError,
  RoleNotAssignedError,
  RoleNotFoundError,
  UserNotFoundError,
} from '../src/users/domain/user.errors.js'
import type { AuthenticatedUserCredentials, UserWithRoles } from '../src/users/domain/user.js'
import type { CreateUserInput, UserRepository } from '../src/users/domain/user.repository.js'

class FakePasswordHasher {
  async hash(password: string) {
    return `argon:${password}`
  }

  async verify(hash: string, password: string) {
    return hash === `argon:${password}`
  }

  isHash(hash: string) {
    return hash.startsWith('argon:')
  }
}

class FakeLegacyHasher {
  async verify(hash: string, password: string) {
    return hash === `bcrypt:${password}`
  }

  isHash(hash: string) {
    return hash.startsWith('bcrypt:')
  }
}

class FakeRoleRepository implements RoleRepository {
  roles = new Map<ERole, Role>([
    ['ROLE_USER', { id: 1, name: 'ROLE_USER' }],
    ['ROLE_MODERATOR', { id: 2, name: 'ROLE_MODERATOR' }],
    ['ROLE_ADMIN', { id: 3, name: 'ROLE_ADMIN' }],
  ])

  async findByName(name: ERole) {
    return this.roles.get(name) ?? null
  }

  async findById(id: number) {
    return Array.from(this.roles.values()).find((role) => role.id === id) ?? null
  }
}

class FakeUserRepository implements UserRepository {
  users = new Map<number, UserWithRoles & { passwordHash: string }>()
  nextId = 1
  failNextAssign = false
  failNextCreate: unknown

  async findCredentialsByUsername(username: string): Promise<AuthenticatedUserCredentials | null> {
    const user = Array.from(this.users.values()).find(
      (candidate) => candidate.username === username,
    )
    return user
      ? {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          roles: user.roles.map((role) => role.name),
        }
      : null
  }

  async findByUsername(username: string) {
    return (
      Array.from(this.users.values()).find((candidate) => candidate.username === username) ?? null
    )
  }

  async findById(id: number) {
    return this.users.get(id) ?? null
  }

  async findAll() {
    return Array.from(this.users.values())
  }

  async existsByUsername(username: string) {
    return Array.from(this.users.values()).some((user) => user.username === username)
  }

  async existsByEmail(email: string) {
    return Array.from(this.users.values()).some((user) => user.email === email)
  }

  async existsById(id: number) {
    return this.users.has(id)
  }

  async createUser(input: CreateUserInput) {
    if (this.failNextCreate) {
      throw this.failNextCreate
    }
    const id = this.nextId
    this.nextId += 1
    this.users.set(id, {
      id,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      roles: [],
    })
    return id
  }

  async updatePasswordHash(userId: number, passwordHash: string) {
    const user = this.users.get(userId)
    if (user) {
      user.passwordHash = passwordHash
    }
  }

  async assignRole(userId: number, roleId: number) {
    if (this.failNextAssign) {
      throw new Error('assign failed')
    }
    const user = this.users.get(userId)
    const role = roles.findByIdSync(roleId)
    if (user && role && !user.roles.some((existing) => existing.id === roleId)) {
      user.roles.push(role)
    }
  }

  async removeRole(userId: number, roleId: number) {
    const user = this.users.get(userId)
    if (user) {
      user.roles = user.roles.filter((role) => role.id !== roleId)
    }
  }

  async hasRole(userId: number, role: ERole) {
    return this.users.get(userId)?.roles.some((candidate) => candidate.name === role) ?? false
  }

  async countUsersByRole(role: ERole) {
    return Array.from(this.users.values()).filter((user) =>
      user.roles.some((candidate) => candidate.name === role),
    ).length
  }

  async countUsersByRoleForUpdate(role: ERole) {
    return this.countUsersByRole(role)
  }

  async deleteById(id: number) {
    this.users.delete(id)
  }
}

class FakeRoles extends FakeRoleRepository {
  findByIdSync(id: number) {
    return Array.from(this.roles.values()).find((role) => role.id === id)
  }
}

let users: FakeUserRepository
let roles: FakeRoles

beforeEach(() => {
  users = new FakeUserRepository()
  roles = new FakeRoles()
})

function transaction<T>(
  work: (repositories: SignUpTransactionRepositories) => Promise<T>,
): Promise<T> {
  const snapshot = new Map(users.users)
  const nextId = users.nextId
  return work({ users, roles }).catch((error: unknown) => {
    users.users = snapshot
    users.nextId = nextId
    throw error
  })
}

function signupRequest(overrides: Partial<SignupRequest> = {}): SignupRequest {
  return {
    username: 'newuser',
    email: 'newuser@example.test',
    password: 'secret1',
    ...overrides,
  }
}

function addUser(input: {
  username: string
  email: string
  roles?: ERole[]
  passwordHash?: string
}) {
  const id = users.nextId
  users.nextId += 1
  users.users.set(id, {
    id,
    username: input.username,
    email: input.email,
    passwordHash: input.passwordHash ?? 'argon:secret1',
    roles: (input.roles ?? ['ROLE_USER']).map((role) => {
      const found = roles.roles.get(role)
      if (!found) {
        throw new Error(`Missing role ${role}`)
      }
      return found
    }),
  })
  return id
}

describe('auth use cases', () => {
  it('signs up a user atomically with ROLE_USER', async () => {
    const result = await signUp(signupRequest(), {
      passwordHasher: new FakePasswordHasher(),
      transaction,
      isDuplicateUsernameError: () => false,
      isDuplicateEmailError: () => false,
    })

    const user = users.users.get(result.userId)
    expect(user?.roles.map((role) => role.name)).toEqual(['ROLE_USER'])
    expect(user?.passwordHash).toBe('argon:secret1')
  })

  it('rejects duplicate username and email before insert', async () => {
    addUser({ username: 'newuser', email: 'taken@example.test' })

    await expect(
      signUp(signupRequest(), {
        passwordHasher: new FakePasswordHasher(),
        transaction,
        isDuplicateUsernameError: () => false,
        isDuplicateEmailError: () => false,
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError)

    await expect(
      signUp(signupRequest({ username: 'other', email: 'taken@example.test' }), {
        passwordHasher: new FakePasswordHasher(),
        transaction,
        isDuplicateUsernameError: () => false,
        isDuplicateEmailError: () => false,
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('rejects missing default role', async () => {
    roles.roles.delete('ROLE_USER')

    await expect(
      signUp(signupRequest(), {
        passwordHasher: new FakePasswordHasher(),
        transaction,
        isDuplicateUsernameError: () => false,
        isDuplicateEmailError: () => false,
      }),
    ).rejects.toBeInstanceOf(DefaultRoleNotFoundError)
  })

  it('rolls back signup when role assignment fails', async () => {
    users.failNextAssign = true

    await expect(
      signUp(signupRequest(), {
        passwordHasher: new FakePasswordHasher(),
        transaction,
        isDuplicateUsernameError: () => false,
        isDuplicateEmailError: () => false,
      }),
    ).rejects.toThrow('assign failed')

    expect(await users.existsByUsername('newuser')).toBe(false)
  })

  it('maps unique-constraint races', async () => {
    users.failNextCreate = new Error('duplicate username')

    await expect(
      signUp(signupRequest(), {
        passwordHasher: new FakePasswordHasher(),
        transaction,
        isDuplicateUsernameError: (error) => error === users.failNextCreate,
        isDuplicateEmailError: () => false,
      }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError)
  })

  it('signs in with Argon2-compatible hashes and hides invalid credential cause', async () => {
    addUser({ username: 'login', email: 'login@example.test' })

    const result = await signIn(
      { username: 'login', password: 'secret1' },
      {
        userRepository: users,
        passwordHasher: new FakePasswordHasher(),
        legacyPasswordHasher: new FakeLegacyHasher(),
        tokenIssuer: { issue: () => 'jwt-token' },
      },
    )

    expect(result.token).toBe('jwt-token')
    await expect(
      signIn(
        { username: 'missing', password: 'secret1' },
        {
          userRepository: users,
          passwordHasher: new FakePasswordHasher(),
          legacyPasswordHasher: new FakeLegacyHasher(),
          tokenIssuer: { issue: () => 'jwt-token' },
        },
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
    await expect(
      signIn(
        { username: 'login', password: 'wrong' },
        {
          userRepository: users,
          passwordHasher: new FakePasswordHasher(),
          legacyPasswordHasher: new FakeLegacyHasher(),
          tokenIssuer: { issue: () => 'jwt-token' },
        },
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('migrates BCrypt-compatible hashes after successful legacy signin', async () => {
    const userId = addUser({
      username: 'legacy',
      email: 'legacy@example.test',
      passwordHash: 'bcrypt:secret1',
    })

    await signIn(
      { username: 'legacy', password: 'secret1' },
      {
        userRepository: users,
        passwordHasher: new FakePasswordHasher(),
        legacyPasswordHasher: new FakeLegacyHasher(),
        tokenIssuer: { issue: () => 'jwt-token' },
      },
    )

    expect(users.users.get(userId)?.passwordHash).toBe('argon:secret1')
  })

  it('creates and verifies real Argon2id hashes', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('secret1')

    expect(hasher.isHash(hash)).toBe(true)
    await expect(hasher.verify(hash, 'secret1')).resolves.toBe(true)
    await expect(hasher.verify(hash, 'wrong')).resolves.toBe(false)
  })

  it('detects real BCrypt hashes for compatibility tests', async () => {
    const hash = await bcrypt.hash('secret1', 4)

    expect(hash.startsWith('$2')).toBe(true)
  })
})

describe('user use cases', () => {
  it('retrieves current user by immutable userId and lists users without hashes', async () => {
    const userId = addUser({ username: 'current', email: 'current@example.test' })

    await expect(getCurrentUser(userId, users)).resolves.toMatchObject({
      username: 'current',
      roles: ['ROLE_USER'],
    })
    await expect(getCurrentUser(999, users)).rejects.toBeInstanceOf(UserNotFoundError)
    expect(await listUsers(users)).toEqual([
      { id: userId, username: 'current', email: 'current@example.test', roles: ['ROLE_USER'] },
    ])
  })

  it('reports availability combinations', async () => {
    addUser({ username: 'taken', email: 'taken@example.test' })

    await expect(
      verifyUserAvailability({ username: 'taken', email: 'free@example.test' }, users),
    ).resolves.toEqual({
      usernameAvailable: false,
      emailAvailable: true,
    })
  })

  it('assigns and removes elevated roles', async () => {
    const userId = addUser({ username: 'roles', email: 'roles@example.test' })

    await assignRole(
      { userId, role: 'ROLE_MODERATOR' },
      { transaction, isDuplicateUserRoleError: () => false },
    )
    expect(await users.hasRole(userId, 'ROLE_MODERATOR')).toBe(true)

    await removeRole({ userId, role: 'ROLE_MODERATOR' }, { transaction })
    expect(await users.hasRole(userId, 'ROLE_MODERATOR')).toBe(false)
  })

  it('rejects duplicate assignment, missing role, and missing assigned role', async () => {
    const userId = addUser({
      username: 'role-errors',
      email: 'role-errors@example.test',
      roles: ['ROLE_MODERATOR'],
    })

    await expect(
      assignRole(
        { userId, role: 'ROLE_MODERATOR' },
        { transaction, isDuplicateUserRoleError: () => false },
      ),
    ).rejects.toBeInstanceOf(RoleAlreadyAssignedError)

    roles.roles.delete('ROLE_ADMIN')
    await expect(
      assignRole(
        { userId, role: 'ROLE_ADMIN' },
        { transaction, isDuplicateUserRoleError: () => false },
      ),
    ).rejects.toBeInstanceOf(RoleNotFoundError)

    await expect(
      removeRole({ userId, role: 'ROLE_ADMIN' }, { transaction }),
    ).rejects.toBeInstanceOf(RoleNotFoundError)
    roles.roles.set('ROLE_ADMIN', { id: 3, name: 'ROLE_ADMIN' })
    await expect(
      removeRole({ userId, role: 'ROLE_ADMIN' }, { transaction }),
    ).rejects.toBeInstanceOf(RoleNotAssignedError)
  })

  it('prevents self deletion and final-admin deletion', async () => {
    const adminId = addUser({
      username: 'admin',
      email: 'admin@example.test',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    })

    await expect(
      deleteUser({ actorUserId: adminId, targetUserId: adminId }, { transaction }),
    ).rejects.toBeInstanceOf(CannotDeleteSelfError)
    await expect(
      deleteUser({ actorUserId: 999, targetUserId: adminId }, { transaction }),
    ).rejects.toBeInstanceOf(CannotDeleteLastAdminError)
  })
})
