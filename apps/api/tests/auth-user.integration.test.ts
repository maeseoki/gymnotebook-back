import { fileURLToPath } from 'node:url'
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../drizzle/schema.js'
import { seedRoles } from '../scripts/seed-roles.js'
import { buildApp, createTestConfig } from '../src/app.js'
import { Argon2PasswordHasher } from '../src/auth/infrastructure/argon2-password-hasher.js'
import { createDatabaseClient, type DatabaseClient } from '../src/shared/db.js'
import type { Env } from '../src/shared/env.js'
import type { ERole } from '../src/users/domain/role.js'

let container: StartedMySqlContainer | undefined
let client: DatabaseClient | undefined
let app: FastifyInstance | undefined
let config: Env | undefined

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('gymnotebook_auth_test')
    .withUsername('gymnotebook')
    .withUserPassword('gymnotebook')
    .withRootPassword('root')
    .start()

  config = createTestConfig({
    DB_HOST: container.getHost(),
    DB_PORT: container.getPort(),
    DB_NAME: container.getDatabase(),
    DB_USER: container.getUsername(),
    DB_PASSWORD: container.getUserPassword(),
  })
  client = createDatabaseClient(config)
  await migrate(client.db, {
    migrationsFolder: fileURLToPath(new URL('../drizzle/migrations', import.meta.url)),
  })
  await seedRoles(client.db)
  app = await buildApp({ config })
})

afterAll(async () => {
  await app?.close()
  await client?.close()
  await container?.stop()
})

describe('auth and user HTTP integration', () => {
  it('signs up a user with the default role and never accepts role input', async () => {
    const response = await requireApp().inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        username: 'signupuser',
        email: 'signupuser@example.test',
        password: 'secret1',
      },
    })

    expect(response.statusCode).toBe(201)
    const user = await findUser('signupuser')
    expect(user?.roles).toEqual(['ROLE_USER'])

    const invalidResponse = await requireApp().inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        username: 'roleuser',
        email: 'roleuser@example.test',
        password: 'secret1',
        role: ['admin'],
      },
    })
    expect(invalidResponse.statusCode).toBe(400)
    expect(invalidResponse.json()).toMatchObject({ code: 'validation_failed' })
  })

  it('maps duplicate username and email constraints to stable conflicts', async () => {
    await createUser('duplicateauth', 'duplicateauth@example.test', ['ROLE_USER'])

    const usernameResponse = await requireApp().inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        username: 'duplicateauth',
        email: 'other-duplicateauth@example.test',
        password: 'secret1',
      },
    })
    expect(usernameResponse.statusCode).toBe(409)
    expect(usernameResponse.json()).toMatchObject({ code: 'username_already_exists' })

    const emailResponse = await requireApp().inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        username: 'otherduplicateauth',
        email: 'duplicateauth@example.test',
        password: 'secret1',
      },
    })
    expect(emailResponse.statusCode).toBe(409)
    expect(emailResponse.json()).toMatchObject({ code: 'email_already_exists' })
  })

  it('signs in with Argon2id and returns no password fields', async () => {
    await createUser('signinuser', 'signinuser@example.test', ['ROLE_USER'])

    const response = await requireApp().inject({
      method: 'POST',
      url: '/api/auth/signin',
      payload: { username: 'signinuser', password: 'secret1' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toMatchObject({
      type: 'Bearer',
      username: 'signinuser',
      email: 'signinuser@example.test',
      roles: ['ROLE_USER'],
    })
    expect(body.password).toBeUndefined()
  })

  it('migrates BCrypt hashes after successful signin', async () => {
    const legacyHash = await bcrypt.hash('secret1', 4)
    const userId = await createUser(
      'bcryptuser',
      'bcryptuser@example.test',
      ['ROLE_USER'],
      legacyHash,
    )

    const response = await requireApp().inject({
      method: 'POST',
      url: '/api/auth/signin',
      payload: { username: 'bcryptuser', password: 'secret1' },
    })

    expect(response.statusCode).toBe(200)
    const rows = await requireClient()
      .db.select({ password: schema.users.password })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
    expect(rows[0]?.password.startsWith('$argon2id$')).toBe(true)
  })

  it('enforces protected routes and role checks', async () => {
    const userId = await createUser('plainuser', 'plainuser@example.test', ['ROLE_USER'])

    const unauthenticated = await requireApp().inject({ method: 'GET', url: '/api/user' })
    expect(unauthenticated.statusCode).toBe(401)

    const forbidden = await requireApp().inject({
      method: 'GET',
      url: '/api/user',
      headers: { authorization: authHeader(userId, 'plainuser', ['ROLE_USER']) },
    })
    expect(forbidden.statusCode).toBe(403)
  })

  it('uses JWT userId for current-user lookup', async () => {
    const userId = await createUser('useriduser', 'useriduser@example.test', ['ROLE_USER'])

    const response = await requireApp().inject({
      method: 'GET',
      url: '/api/user/me',
      headers: { authorization: authHeader(userId, 'stale-username', ['ROLE_USER']) },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ username: 'useriduser' })
    expect(response.json().password).toBeUndefined()
  })

  it('assigns and removes elevated roles through HTTP', async () => {
    const adminId = await createUser('roleadmin', 'roleadmin@example.test', [
      'ROLE_USER',
      'ROLE_ADMIN',
    ])
    const targetId = await createUser('roletarget', 'roletarget@example.test', ['ROLE_USER'])

    const assignResponse = await requireApp().inject({
      method: 'PUT',
      url: '/api/user/setpermissions',
      headers: { authorization: authHeader(adminId, 'roleadmin', ['ROLE_ADMIN']) },
      payload: { userId: targetId, newRole: 'ROLE_MODERATOR' },
    })
    expect(assignResponse.statusCode).toBe(200)
    expect(await userHasRole(targetId, 'ROLE_MODERATOR')).toBe(true)

    const duplicateResponse = await requireApp().inject({
      method: 'PUT',
      url: '/api/user/setpermissions',
      headers: { authorization: authHeader(adminId, 'roleadmin', ['ROLE_ADMIN']) },
      payload: { userId: targetId, newRole: 'ROLE_MODERATOR' },
    })
    expect(duplicateResponse.statusCode).toBe(409)
    expect(duplicateResponse.json()).toMatchObject({ code: 'role_already_assigned' })

    const removeResponse = await requireApp().inject({
      method: 'PUT',
      url: '/api/user/removepermissions',
      headers: { authorization: authHeader(adminId, 'roleadmin', ['ROLE_ADMIN']) },
      payload: { userId: targetId, newRole: 'ROLE_MODERATOR' },
    })
    expect(removeResponse.statusCode).toBe(200)
    expect(await userHasRole(targetId, 'ROLE_MODERATOR')).toBe(false)
  })

  it('deletes users with 204 and preserves final administrator policy', async () => {
    const adminId = await createUser('deleteadmin', 'deleteadmin@example.test', [
      'ROLE_USER',
      'ROLE_ADMIN',
    ])
    await createUser('backupadmin', 'backupadmin@example.test', ['ROLE_USER', 'ROLE_ADMIN'])
    const targetId = await createUser('deletetarget', 'deletetarget@example.test', ['ROLE_USER'])

    const deleteResponse = await requireApp().inject({
      method: 'DELETE',
      url: `/api/user/${targetId}`,
      headers: { authorization: authHeader(adminId, 'deleteadmin', ['ROLE_ADMIN']) },
    })
    expect(deleteResponse.statusCode).toBe(204)
    expect(await findUser('deletetarget')).toBeNull()

    const selfDeleteResponse = await requireApp().inject({
      method: 'DELETE',
      url: `/api/user/${adminId}`,
      headers: { authorization: authHeader(adminId, 'deleteadmin', ['ROLE_ADMIN']) },
    })
    expect(selfDeleteResponse.statusCode).toBe(403)
    expect(selfDeleteResponse.json()).toMatchObject({ code: 'cannot_delete_self' })
  })
})

async function createUser(
  username: string,
  email: string,
  roleNames: ERole[],
  passwordHash?: string,
): Promise<number> {
  const hasher = new Argon2PasswordHasher()
  const inserted = await requireClient()
    .db.insert(schema.users)
    .values({
      username,
      email,
      password: passwordHash ?? (await hasher.hash('secret1')),
    })
    .$returningId()
  const userId = inserted[0]?.id
  if (typeof userId !== 'number') {
    throw new Error('Expected user id')
  }
  const roles = await requireClient().db.select().from(schema.roles)
  const roleIds = roleNames.map((name) => {
    const role = roles.find((candidate) => candidate.name === name)
    if (!role) {
      throw new Error(`Missing role ${name}`)
    }
    return role.id
  })
  await requireClient()
    .db.insert(schema.userRoles)
    .values(roleIds.map((roleId) => ({ userId, roleId })))
  return userId
}

async function findUser(username: string): Promise<{ id: number; roles: ERole[] } | null> {
  const rows = await requireClient()
    .db.select({
      id: schema.users.id,
      roleName: schema.roles.name,
    })
    .from(schema.users)
    .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
    .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.users.username, username))
  const [first] = rows
  if (!first) {
    return null
  }
  return {
    id: first.id,
    roles: rows.flatMap((row) => (row.roleName ? [row.roleName] : [])),
  }
}

async function userHasRole(userId: number, role: ERole): Promise<boolean> {
  const rows = await requireClient()
    .db.select({ userId: schema.userRoles.userId })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.roles.name, role)))
  return rows.length > 0
}

function authHeader(userId: number, username: string, roles: ERole[]) {
  return `Bearer ${requireApp().jwt.sign({ sub: username, userId, roles })}`
}

function requireApp(): FastifyInstance {
  if (!app) {
    throw new Error('App was not initialized')
  }
  return app
}

function requireClient(): DatabaseClient {
  if (!client) {
    throw new Error('Database client was not initialized')
  }
  return client
}
