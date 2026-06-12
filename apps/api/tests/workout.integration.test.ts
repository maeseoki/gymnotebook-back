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

  describe('saved workout mutations', () => {
    it('deletes a workout owned by the user, cascades deletions, and handles non-owner/missing cases', async () => {
      const ownerId = await createUser('del-workout-owner', 'del-workout-owner@example.test')
      const otherId = await createUser('del-workout-other', 'del-workout-other@example.test')
      const exerciseId = await createExercise(ownerId, 'Squat')

      // Create workout
      const payload = workoutPayload(exerciseId)
      const resCreate = await createWorkoutRequest(ownerId, 'del-workout-owner', payload)
      expect(resCreate.statusCode).toBe(201)

      // Query workout to find its database ID
      const resRead = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'del-workout-owner') },
      })
      const workoutId = resRead.json()[0].id
      expect(workoutId).toBeDefined()

      // Attempt to delete by another user -> expect 404
      const resDeleteOther = await requireApp().inject({
        method: 'DELETE',
        url: `/api/workout/${workoutId}`,
        headers: { authorization: authHeader(otherId, 'del-workout-other') },
      })
      expect(resDeleteOther.statusCode).toBe(404)
      expect(resDeleteOther.json()).toMatchObject({ code: 'workout_not_found' })

      // Attempt to delete non-existent workout -> expect 404
      const resDeleteMissing = await requireApp().inject({
        method: 'DELETE',
        url: '/api/workout/999999',
        headers: { authorization: authHeader(ownerId, 'del-workout-owner') },
      })
      expect(resDeleteMissing.statusCode).toBe(404)
      expect(resDeleteMissing.json()).toMatchObject({ code: 'workout_not_found' })

      // Delete by owner -> expect 204
      const resDeleteOwner = await requireApp().inject({
        method: 'DELETE',
        url: `/api/workout/${workoutId}`,
        headers: { authorization: authHeader(ownerId, 'del-workout-owner') },
      })
      expect(resDeleteOwner.statusCode).toBe(204)

      // Verify workout no longer appears in GET workouts
      const resReadAgain = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'del-workout-owner') },
      })
      expect(resReadAgain.json()).toHaveLength(0)
    })

    it('updates a set owned by the user, validates bounds and fields, and handles non-owner/missing cases', async () => {
      const ownerId = await createUser('up-set-owner', 'up-set-owner@example.test')
      const otherId = await createUser('up-set-other', 'up-set-other@example.test')
      const exerciseId = await createExercise(ownerId, 'Leg Press')

      const payload = workoutPayload(exerciseId)
      await createWorkoutRequest(ownerId, 'up-set-owner', payload)

      // Get workouts
      const resRead = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
      })
      const setId = resRead.json()[0].workoutSets[0].sets[0].id
      expect(setId).toBeDefined()

      // Attempt to update by another user -> expect 404
      const resUpdateOther = await requireApp().inject({
        method: 'PATCH',
        url: `/api/workout/sets/${setId}`,
        headers: { authorization: authHeader(otherId, 'up-set-other') },
        payload: { reps: 8, weight: 82500 },
      })
      expect(resUpdateOther.statusCode).toBe(404)
      expect(resUpdateOther.json()).toMatchObject({ code: 'set_not_found' })

      // Attempt to update non-existent set -> expect 404
      const resUpdateMissing = await requireApp().inject({
        method: 'PATCH',
        url: '/api/workout/sets/999999',
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
        payload: { reps: 8, weight: 82500 },
      })
      expect(resUpdateMissing.statusCode).toBe(404)
      expect(resUpdateMissing.json()).toMatchObject({ code: 'set_not_found' })

      // Attempt to update with invalid payload (e.g. negative weight) -> expect 400
      const resUpdateInvalid = await requireApp().inject({
        method: 'PATCH',
        url: `/api/workout/sets/${setId}`,
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
        payload: { weight: -100 },
      })
      expect(resUpdateInvalid.statusCode).toBe(400)
      expect(resUpdateInvalid.json()).toMatchObject({ code: 'validation_failed' })

      // Attempt to update with empty payload -> expect 400
      const resUpdateEmpty = await requireApp().inject({
        method: 'PATCH',
        url: `/api/workout/sets/${setId}`,
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
        payload: {},
      })
      expect(resUpdateEmpty.statusCode).toBe(400)
      expect(resUpdateEmpty.json()).toMatchObject({ code: 'validation_failed' })

      // Attempt to update with invalid date outside workout range -> expect 400
      const resUpdateInvalidDate = await requireApp().inject({
        method: 'PATCH',
        url: `/api/workout/sets/${setId}`,
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
        payload: { startDate: '2026-03-30T10:00:00Z' }, // workout end date is 2026-03-29T03:30:00+02:00
      })
      expect(resUpdateInvalidDate.statusCode).toBe(400)
      expect(resUpdateInvalidDate.json()).toMatchObject({ code: 'invalid_workout_set_time' })

      // Update by owner successfully
      const resUpdateOwner = await requireApp().inject({
        method: 'PATCH',
        url: `/api/workout/sets/${setId}`,
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
        payload: { reps: 12, weight: 82500, notes: 'Updated notes' },
      })
      expect(resUpdateOwner.statusCode).toBe(200)
      expect(resUpdateOwner.json()).toMatchObject({
        reps: 12,
        weight: 82500,
        notes: 'Updated notes',
      })

      // Verify update in GET workouts
      const resReadAgain = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'up-set-owner') },
      })
      expect(resReadAgain.json()[0].workoutSets[0].sets[0]).toMatchObject({
        reps: 12,
        weight: 82500,
        notes: 'Updated notes',
      })
    })

    it('deletes a set, cleans up empty parents, and handles non-owner/missing cases', async () => {
      const ownerId = await createUser('del-set-owner', 'del-set-owner@example.test')
      const otherId = await createUser('del-set-other', 'del-set-other@example.test')
      const exerciseId = await createExercise(ownerId, 'Deadlift')

      const payload = workoutPayload(exerciseId)
      await createWorkoutRequest(ownerId, 'del-set-owner', payload)

      // Get workouts
      const resRead = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'del-set-owner') },
      })
      const workout = resRead.json()[0]
      const firstSetId = workout.workoutSets[0].sets[0].id
      const secondSetId = workout.workoutSets[0].sets[1].id
      expect(firstSetId).toBeDefined()
      expect(secondSetId).toBeDefined()

      // Attempt to delete by another user -> expect 404
      const resDeleteOther = await requireApp().inject({
        method: 'DELETE',
        url: `/api/workout/sets/${firstSetId}`,
        headers: { authorization: authHeader(otherId, 'del-set-other') },
      })
      expect(resDeleteOther.statusCode).toBe(404)
      expect(resDeleteOther.json()).toMatchObject({ code: 'set_not_found' })

      // Attempt to delete missing set -> expect 404
      const resDeleteMissing = await requireApp().inject({
        method: 'DELETE',
        url: '/api/workout/sets/999999',
        headers: { authorization: authHeader(ownerId, 'del-set-owner') },
      })
      expect(resDeleteMissing.statusCode).toBe(404)
      expect(resDeleteMissing.json()).toMatchObject({ code: 'set_not_found' })

      // Delete the first set -> expect 204
      const resDeleteFirst = await requireApp().inject({
        method: 'DELETE',
        url: `/api/workout/sets/${firstSetId}`,
        headers: { authorization: authHeader(ownerId, 'del-set-owner') },
      })
      expect(resDeleteFirst.statusCode).toBe(204)

      // Verify only second set is left in GET workouts
      const resReadFirstDelete = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'del-set-owner') },
      })
      expect(resReadFirstDelete.json()[0].workoutSets[0].sets).toHaveLength(1)
      expect(resReadFirstDelete.json()[0].workoutSets[0].sets[0].id).toBe(secondSetId)

      // Delete the second (last) set -> expect 204. Since this is the last set in the workoutSet,
      // it should delete the workoutSet. Since that is the only workoutSet in the workout,
      // it should delete the workout.
      const resDeleteLast = await requireApp().inject({
        method: 'DELETE',
        url: `/api/workout/sets/${secondSetId}`,
        headers: { authorization: authHeader(ownerId, 'del-set-owner') },
      })
      expect(resDeleteLast.statusCode).toBe(204)

      // Verify that the whole workout is deleted
      const resReadAfterAllDeleted = await requireApp().inject({
        method: 'GET',
        url: '/api/workout/workouts/2026-03-29?timezone=Europe/Madrid',
        headers: { authorization: authHeader(ownerId, 'del-set-owner') },
      })
      expect(resReadAfterAllDeleted.json()).toHaveLength(0)
    })
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
