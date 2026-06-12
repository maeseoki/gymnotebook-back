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

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('gymnotebook_workout_test')
    .withUsername('gymnotebook')
    .withUserPassword('gymnotebook')
    .withRootPassword('root')
    .start()

  const config: Env = createTestConfig({
    DB_HOST: container.getHost(),
    DB_PORT: container.getPort(),
    DB_NAME: container.getDatabase(),
    DB_USER: container.getUsername(),
    DB_PASSWORD: container.getUserPassword(),
    DEFAULT_TIMEZONE: 'Europe/Madrid',
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

describe('workout and history HTTP integration', () => {
  it('requires JWT for workout and history endpoints', async () => {
    for (const request of [
      { method: 'POST', url: '/api/workout', payload: workoutPayload(1) },
      { method: 'GET', url: '/api/workout/days/3/2026' },
      { method: 'GET', url: '/api/workout/workouts/2026-03-29' },
      { method: 'GET', url: '/api/workout-sets/exercise/1' },
    ] as const) {
      const response = await requireApp().inject(request)
      expect(response.statusCode).toBe(401)
      expect(response.json()).toMatchObject({ code: 'unauthorized' })
    }
  })

  it('creates a workout graph atomically and reads nested workouts by local date', async () => {
    const userId = await createUser('workout-owner', 'workout-owner@example.test')
    const exerciseId = await createExercise(userId, 'Bench press')
    const response = await createWorkoutRequest(userId, 'workout-owner', workoutPayload(exerciseId))

    expect(response.statusCode).toBe(201)

    const workouts = await requireClient().db.select().from(schema.workouts)
    const groups = await requireClient().db.select().from(schema.workoutSets)
    const sets = await requireClient().db.select().from(schema.sets)
    expect(workouts).toHaveLength(1)
    expect(groups).toHaveLength(1)
    expect(sets).toHaveLength(2)
    expect(workouts[0]?.startDate).toBe('2026-03-28 23:30:00')

    const read = await requireApp().inject({
      method: 'GET',
      url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
      headers: { authorization: authHeader(userId, 'workout-owner') },
    })
    expect(read.statusCode).toBe(200)
    expect(read.json()).toMatchObject([
      {
        startDate: '2026-03-28T23:30:00Z',
        workoutSets: [
          {
            exercise: { id: exerciseId, name: 'Bench press' },
            sets: [{ reps: 5 }, { reps: 3 }],
          },
        ],
      },
    ])
    expect(read.json()[0].userId).toBeUndefined()
  })

  it('rejects foreign exercises and rolls back without partial rows', async () => {
    const ownerId = await createUser('foreign-owner', 'foreign-workout-owner@example.test')
    const otherId = await createUser('foreign-other', 'foreign-workout-other@example.test')
    const foreignExerciseId = await createExercise(otherId, 'Foreign lift')
    const payload = workoutPayload(foreignExerciseId)

    const response = await createWorkoutRequest(ownerId, 'foreign-owner', payload)

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'workout_exercise_not_available' })
    const rows = await requireClient()
      .db.select()
      .from(schema.workouts)
      .where(eq(schema.workouts.uuid, payload.uuid))
    expect(rows).toHaveLength(0)
  })

  it('maps concurrent duplicate UUID creation to workout_already_exists', async () => {
    const userId = await createUser('duplicate-workout', 'duplicate-workout@example.test')
    const exerciseId = await createExercise(userId, 'Duplicate lift')
    const uuid = randomUUID()

    const responses = await Promise.all([
      createWorkoutRequest(userId, 'duplicate-workout', workoutPayload(exerciseId, { uuid })),
      createWorkoutRequest(userId, 'duplicate-workout', workoutPayload(exerciseId, { uuid })),
    ])

    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409])
    expect(responses.find((response) => response.statusCode === 409)?.json()).toMatchObject({
      code: 'workout_already_exists',
    })
  })

  it('uses local timezone semantics for workout days, year boundaries, and DST dates', async () => {
    const userId = await createUser('days-workout', 'days-workout@example.test')
    const exerciseId = await createExercise(userId, 'Days lift')
    await createWorkoutRequest(
      userId,
      'days-workout',
      workoutPayload(exerciseId, {
        uuid: randomUUID(),
        startDate: '2025-12-31T23:30:00Z',
        endDate: '2026-01-01T00:00:00Z',
      }),
    )
    await createWorkoutRequest(
      userId,
      'days-workout',
      workoutPayload(exerciseId, {
        uuid: randomUUID(),
        startDate: '2026-10-25T00:30:00Z',
        endDate: '2026-10-25T02:30:00Z',
      }),
    )

    const january = await requireApp().inject({
      method: 'GET',
      url: '/api/workout/days/1/2026?timezone=Europe/Madrid',
      headers: { authorization: authHeader(userId, 'days-workout') },
    })
    expect(january.statusCode).toBe(200)
    expect(january.json()).toEqual([1])

    const october = await requireApp().inject({
      method: 'GET',
      url: '/api/workout/days/10/2026?timezone=Europe/Madrid',
      headers: { authorization: authHeader(userId, 'days-workout') },
    })
    expect(october.statusCode).toBe(200)
    expect(october.json()).toEqual([25])
  })

  it('validates inputs with common errors including invalid timezone and periods', async () => {
    const userId = await createUser('invalid-workout', 'invalid-workout@example.test')
    const exerciseId = await createExercise(userId, 'Invalid lift')

    const invalidTimezone = await requireApp().inject({
      method: 'GET',
      url: '/api/workout/workouts/2026-03-29?timezone=Not/AZone',
      headers: { authorization: authHeader(userId, 'invalid-workout') },
    })
    expect(invalidTimezone.statusCode).toBe(400)
    expect(invalidTimezone.json()).toMatchObject({ code: 'invalid_timezone' })

    const invalidPeriod = await createWorkoutRequest(
      userId,
      'invalid-workout',
      workoutPayload(exerciseId, {
        startDate: '2026-03-29T02:00:00Z',
        endDate: '2026-03-29T01:00:00Z',
      }),
    )
    expect(invalidPeriod.statusCode).toBe(400)
    expect(invalidPeriod.json()).toMatchObject({ code: 'invalid_workout_period' })

    const invalidSort = await requireApp().inject({
      method: 'GET',
      url: `/api/workout-sets/exercise/${exerciseId}?sortBy=name`,
      headers: { authorization: authHeader(userId, 'invalid-workout') },
    })
    expect(invalidSort.statusCode).toBe(400)
    expect(invalidSort.json()).toMatchObject({ code: 'validation_failed' })
  })

  it('paginates and sorts exercise history without leaking other users rows', async () => {
    const userId = await createUser('history-workout', 'history-workout@example.test')
    const otherId = await createUser('history-other', 'history-other@example.test')
    const exerciseId = await createExercise(userId, 'History lift')
    const otherExerciseId = await createExercise(otherId, 'Other history lift')

    await createWorkoutRequest(
      userId,
      'history-workout',
      workoutPayload(exerciseId, { uuid: randomUUID(), startDate: '2026-03-29T00:00:00Z' }),
    )
    await createWorkoutRequest(
      userId,
      'history-workout',
      workoutPayload(exerciseId, {
        uuid: randomUUID(),
        startDate: '2026-03-30T00:00:00Z',
        endDate: '2026-03-30T01:00:00Z',
      }),
    )
    await createWorkoutRequest(
      otherId,
      'history-other',
      workoutPayload(otherExerciseId, {
        uuid: randomUUID(),
        startDate: '2026-03-30T00:00:00Z',
        endDate: '2026-03-30T01:00:00Z',
      }),
    )

    const response = await requireApp().inject({
      method: 'GET',
      url: `/api/workout-sets/exercise/${exerciseId}?page=0&pageSize=1&sortBy=startDate&sortDirection=asc`,
      headers: { authorization: authHeader(userId, 'history-workout') },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      totalElements: 2,
      totalPages: 2,
      page: 0,
      pageSize: 1,
      content: [{ exercise: { id: exerciseId }, sets: [{ reps: 5 }, { reps: 3 }] }],
    })

    const foreign = await requireApp().inject({
      method: 'GET',
      url: `/api/workout-sets/exercise/${otherExerciseId}`,
      headers: { authorization: authHeader(userId, 'history-workout') },
    })
    expect(foreign.statusCode).toBe(404)
    expect(foreign.json()).toMatchObject({ code: 'exercise_not_found' })
  })
})

function workoutPayload(
  exerciseId: number,
  overrides: Partial<{
    uuid: string
    startDate: string
    endDate: string
  }> = {},
) {
  const startDate = overrides.startDate ?? '2026-03-29T00:30:00+01:00'
  return {
    uuid: overrides.uuid ?? randomUUID(),
    startDate,
    endDate: overrides.endDate ?? '2026-03-29T03:30:00+02:00',
    notes: 'Workout',
    workoutSets: [
      {
        exercise: { id: exerciseId },
        startDate,
        endDate: overrides.endDate ?? '2026-03-29T03:30:00+02:00',
        notes: 'Group',
        sets: [
          {
            reps: 5,
            weight: 100,
            time: 0,
            distance: 0,
            notes: 'First',
            isDropSet: false,
            startDate,
          },
          {
            reps: 3,
            weight: 90,
            time: 0,
            distance: 0,
            notes: null,
            isDropSet: true,
            startDate: overrides.endDate ?? '2026-03-29T03:30:00+02:00',
          },
        ],
      },
    ],
  }
}

async function createWorkoutRequest(
  userId: number,
  username: string,
  payload: ReturnType<typeof workoutPayload>,
) {
  return requireApp().inject({
    method: 'POST',
    url: '/api/workout',
    headers: { authorization: authHeader(userId, username) },
    payload,
  })
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

async function createExercise(userId: number, name: string): Promise<number> {
  const inserted = await requireClient()
    .db.insert(schema.exercises)
    .values({
      name,
      description: 'Description',
      imageId: null,
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
