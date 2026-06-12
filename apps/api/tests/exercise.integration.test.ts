import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql'
import { eq } from 'drizzle-orm'
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
    .withDatabase('gymnotebook_exercise_test')
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

describe('exercise HTTP integration', () => {
  it('requires JWT for every endpoint', async () => {
    for (const request of [
      { method: 'GET', url: '/api/exercise' },
      { method: 'GET', url: '/api/exercise/1' },
      { method: 'POST', url: '/api/exercise', payload: validPayload() },
      { method: 'PUT', url: '/api/exercise/1', payload: validPayload() },
      { method: 'DELETE', url: '/api/exercise/1' },
    ] as const) {
      const response = await requireApp().inject(request)
      expect(response.statusCode).toBe(401)
      expect(response.json()).toMatchObject({ code: 'unauthorized' })
    }
  })

  it('creates, reads, lists, updates, and deletes owned exercises', async () => {
    const userId = await createUser('exerciseowner', 'exerciseowner@example.test')
    const imageId = await createImage(userId)

    const createResponse = await requireApp().inject({
      method: 'POST',
      url: '/api/exercise',
      headers: { authorization: authHeader(userId, 'exerciseowner') },
      payload: {
        name: '  Bench press  ',
        description: '  Chest movement  ',
        imageId,
        type: 'WEIGHT_REPS',
        primaryMuscleGroup: 'CHEST',
        secondaryMuscleGroup: 'TRICEPS',
      },
    })

    expect(createResponse.statusCode).toBe(201)
    expect(createResponse.json()).toMatchObject({
      name: 'Bench press',
      description: 'Chest movement',
      imageId,
      type: 'WEIGHT_REPS',
    })
    expect(createResponse.json().userId).toBeUndefined()
    const exerciseId = createResponse.json<{ id: number }>().id

    const getResponse = await requireApp().inject({
      method: 'GET',
      url: `/api/exercise/${exerciseId}`,
      headers: { authorization: authHeader(userId, 'exerciseowner') },
    })
    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json()).toMatchObject({ id: exerciseId, name: 'Bench press' })

    await createExercise(userId, 'Aardvark row')
    const listResponse = await requireApp().inject({
      method: 'GET',
      url: '/api/exercise',
      headers: { authorization: authHeader(userId, 'exerciseowner') },
    })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json<Array<{ name: string }>>().map((exercise) => exercise.name)).toEqual([
      'Aardvark row',
      'Bench press',
    ])

    const updateResponse = await requireApp().inject({
      method: 'PUT',
      url: `/api/exercise/${exerciseId}`,
      headers: { authorization: authHeader(userId, 'exerciseowner') },
      payload: {
        name: 'Incline press',
        description: '',
        imageId: null,
        type: 'WEIGHT_REPS',
        primaryMuscleGroup: 'CHEST',
        secondaryMuscleGroup: null,
      },
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.json()).toMatchObject({
      id: exerciseId,
      name: 'Incline press',
      description: null,
      imageId: null,
    })

    const deleteResponse = await requireApp().inject({
      method: 'DELETE',
      url: `/api/exercise/${exerciseId}`,
      headers: { authorization: authHeader(userId, 'exerciseowner') },
    })
    expect(deleteResponse.statusCode).toBe(204)
  })

  it('isolates list/get/update/delete between users without leaking existence', async () => {
    const ownerId = await createUser('owneruser', 'owneruser@example.test')
    const otherId = await createUser('otheruser', 'otheruser@example.test')
    const exerciseId = await createExercise(ownerId, 'Private lift')
    await createExercise(otherId, 'Other lift')

    const listResponse = await requireApp().inject({
      method: 'GET',
      url: '/api/exercise',
      headers: { authorization: authHeader(ownerId, 'owneruser') },
    })
    expect(listResponse.json<Array<{ name: string }>>().map((exercise) => exercise.name)).toContain(
      'Private lift',
    )
    expect(
      listResponse.json<Array<{ name: string }>>().map((exercise) => exercise.name),
    ).not.toContain('Other lift')

    for (const request of [
      { method: 'GET', url: `/api/exercise/${exerciseId}` },
      {
        method: 'PUT',
        url: `/api/exercise/${exerciseId}`,
        payload: validPayload({ name: 'Steal update' }),
      },
      { method: 'DELETE', url: `/api/exercise/${exerciseId}` },
    ] as const) {
      const response = await requireApp().inject({
        ...request,
        headers: { authorization: authHeader(otherId, 'otheruser') },
      })
      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ code: 'exercise_not_found' })
    }
  })

  it('validates input and rejects unknown body ids', async () => {
    const userId = await createUser('validationuser', 'validationuser@example.test')

    const response = await requireApp().inject({
      method: 'POST',
      url: '/api/exercise',
      headers: { authorization: authHeader(userId, 'validationuser') },
      payload: { ...validPayload({ name: '   ' }), id: 123 },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'validation_failed' })
  })

  it('enforces image ownership and rejects unresolved legacy images for new assignment', async () => {
    const userId = await createUser('imageowner', 'imageowner@example.test')
    const otherId = await createUser('imageother', 'imageother@example.test')
    const foreignImageId = await createImage(otherId)
    const unresolvedImageId = await createImage(null)

    for (const imageId of [foreignImageId, unresolvedImageId]) {
      const response = await requireApp().inject({
        method: 'POST',
        url: '/api/exercise',
        headers: { authorization: authHeader(userId, 'imageowner') },
        payload: validPayload({ imageId }),
      })

      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ code: 'image_not_available' })
    }

    const existing = await createExercise(userId, 'Legacy image read', unresolvedImageId)
    const readResponse = await requireApp().inject({
      method: 'GET',
      url: `/api/exercise/${existing}`,
      headers: { authorization: authHeader(userId, 'imageowner') },
    })
    expect(readResponse.statusCode).toBe(200)
    expect(readResponse.json()).toMatchObject({ imageId: unresolvedImageId })
  })

  it('maps restrictive workout-history references to exercise_in_use', async () => {
    const userId = await createUser('historyuser', 'historyuser@example.test')
    const exerciseId = await createExercise(userId, 'History lift')
    await createWorkoutSetReference(userId, exerciseId)

    const response = await requireApp().inject({
      method: 'DELETE',
      url: `/api/exercise/${exerciseId}`,
      headers: { authorization: authHeader(userId, 'historyuser') },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: 'exercise_in_use' })
  })
})

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Squat',
    description: 'Leg movement',
    imageId: null,
    type: 'WEIGHT_REPS',
    primaryMuscleGroup: 'QUADRICEPS',
    secondaryMuscleGroup: 'GLUTES',
    ...overrides,
  }
}

async function createUser(username: string, email: string): Promise<number> {
  const hasher = new Argon2PasswordHasher()
  const inserted = await requireClient()
    .db.insert(schema.users)
    .values({ username, email, password: await hasher.hash('secret1') })
    .$returningId()
  const userId = inserted[0]?.id
  if (typeof userId !== 'number') {
    throw new Error('Expected user id')
  }
  const role = await requireClient()
    .db.select()
    .from(schema.roles)
    .where(eq(schema.roles.name, 'ROLE_USER'))
    .limit(1)
  const roleId = role[0]?.id
  if (typeof roleId !== 'number') {
    throw new Error('Expected ROLE_USER')
  }
  await requireClient().db.insert(schema.userRoles).values({ userId, roleId })
  return userId
}

async function createImage(userId: number | null): Promise<number> {
  const inserted = await requireClient()
    .db.insert(schema.imageData)
    .values({
      name: `image-${randomUUID()}.png`,
      type: 'image/png',
      imageData: Buffer.from('image'),
      userId,
    })
    .$returningId()
  const imageId = inserted[0]?.id
  if (typeof imageId !== 'number') {
    throw new Error('Expected image id')
  }
  return imageId
}

async function createExercise(
  userId: number,
  name: string,
  imageId: number | null = null,
): Promise<number> {
  const inserted = await requireClient()
    .db.insert(schema.exercises)
    .values({
      name,
      description: 'Description',
      imageId,
      type: 'WEIGHT_REPS',
      primaryMuscleGroup: 'CHEST',
      secondaryMuscleGroup: 'TRICEPS',
      userId,
    })
    .$returningId()
  const exerciseId = inserted[0]?.id
  if (typeof exerciseId !== 'number') {
    throw new Error('Expected exercise id')
  }
  return exerciseId
}

async function createWorkoutSetReference(userId: number, exerciseId: number): Promise<void> {
  const workout = await requireClient()
    .db.insert(schema.workouts)
    .values({
      uuid: randomUUID(),
      userId,
      startDate: '2026-01-01 10:00:00',
      endDate: '2026-01-01 11:00:00',
    })
    .$returningId()
  const workoutId = workout[0]?.id
  if (typeof workoutId !== 'number') {
    throw new Error('Expected workout id')
  }
  await requireClient().db.insert(schema.workoutSets).values({
    workoutId,
    exerciseId,
    startDate: '2026-01-01 10:00:00',
    endDate: '2026-01-01 11:00:00',
  })
}

function authHeader(userId: number, username: string, roles: ERole[] = ['ROLE_USER']) {
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
