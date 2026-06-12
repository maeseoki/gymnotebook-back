import { and, count, eq } from 'drizzle-orm'
import * as schema from '../../../drizzle/schema.js'
import type { DbExecutor } from '../../shared/transaction.js'
import type { ERole } from '../domain/role.js'
import type { AuthenticatedUserCredentials, UserRole, UserWithRoles } from '../domain/user.js'
import type { CreateUserInput, UserRepository } from '../domain/user.repository.js'

interface JoinedUserRoleRow {
  id: number
  username: string
  email: string
  password?: string
  roleId: number | null
  roleName: ERole | null
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DbExecutor) {}

  async findByUsername(username: string): Promise<UserWithRoles | null> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.users.username, username))

    return mapPublicJoinedRows(rows)
  }

  async findCredentialsByUsername(username: string): Promise<AuthenticatedUserCredentials | null> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        password: schema.users.password,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.users.username, username))

    const user = mapJoinedRows(rows)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.password,
      roles: user.roles.map((role) => role.name),
    }
  }

  async findById(id: number): Promise<UserWithRoles | null> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.users.id, id))

    return mapPublicJoinedRows(rows)
  }

  async findAll(): Promise<UserWithRoles[]> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))

    return mapAllPublicRows(rows)
  }

  async existsByUsername(username: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1)
    return rows.length > 0
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)
    return rows.length > 0
  }

  async existsById(id: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)
    return rows.length > 0
  }

  async createUser(input: CreateUserInput): Promise<number> {
    const inserted = await this.db
      .insert(schema.users)
      .values({
        username: input.username,
        email: input.email,
        password: input.passwordHash,
      })
      .$returningId()
    const userId = inserted[0]?.id
    if (typeof userId !== 'number') {
      throw new Error('Failed to create user')
    }
    return userId
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ password: passwordHash })
      .where(eq(schema.users.id, userId))
  }

  async assignRole(userId: number, roleId: number): Promise<void> {
    await this.db.insert(schema.userRoles).values({ userId, roleId })
  }

  async removeRole(userId: number, roleId: number): Promise<void> {
    await this.db
      .delete(schema.userRoles)
      .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.roleId, roleId)))
  }

  async hasRole(userId: number, role: ERole): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.userRoles.userId })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(and(eq(schema.userRoles.userId, userId), eq(schema.roles.name, role)))
      .limit(1)
    return rows.length > 0
  }

  async countUsersByRole(role: ERole): Promise<number> {
    const rows = await this.db
      .select({ total: count() })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.roles.name, role))
    return rows[0]?.total ?? 0
  }

  async countUsersByRoleForUpdate(role: ERole): Promise<number> {
    const rows = await this.db
      .select({ userId: schema.userRoles.userId })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.roles.name, role))
      .for('update')
    return rows.length
  }

  async deleteById(id: number): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id))
  }
}

function mapJoinedRows(rows: JoinedUserRoleRow[]): (UserWithRoles & { password: string }) | null {
  if (rows.length === 0) {
    return null
  }
  const [first] = rows
  if (!first?.password) {
    return null
  }

  return {
    id: first.id,
    username: first.username,
    email: first.email,
    password: first.password,
    roles: mapRoles(rows),
  }
}

function mapPublicJoinedRows(rows: Omit<JoinedUserRoleRow, 'password'>[]): UserWithRoles | null {
  if (rows.length === 0) {
    return null
  }
  const [first] = rows
  if (!first) {
    return null
  }

  return {
    id: first.id,
    username: first.username,
    email: first.email,
    roles: mapRoles(rows),
  }
}

function mapAllPublicRows(rows: Omit<JoinedUserRoleRow, 'password'>[]): UserWithRoles[] {
  const users = new Map<number, UserWithRoles>()
  for (const row of rows) {
    const user =
      users.get(row.id) ??
      ({
        id: row.id,
        username: row.username,
        email: row.email,
        roles: [],
      } satisfies UserWithRoles)
    if (
      row.roleId !== null &&
      row.roleName !== null &&
      !user.roles.some((role) => role.id === row.roleId)
    ) {
      user.roles.push({ id: row.roleId, name: row.roleName })
    }
    users.set(row.id, user)
  }
  return Array.from(users.values())
}

function mapRoles(rows: Array<{ roleId: number | null; roleName: ERole | null }>): UserRole[] {
  return rows
    .filter((row): row is { roleId: number; roleName: ERole } => {
      return row.roleId !== null && row.roleName !== null
    })
    .map((row) => ({ id: row.roleId, name: row.roleName }))
}
