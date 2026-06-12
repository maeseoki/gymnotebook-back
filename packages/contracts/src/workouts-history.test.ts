import { describe, expect, it } from 'vitest'
import { IanaTimezoneSchema } from './common/index.js'
import { WorkoutHistoryQuerySchema } from './workout-history/index.js'
import {
  CreateWorkoutRequestSchema,
  type SetRequest,
  WorkoutDateParamSchema,
  WorkoutResponseSchema,
  type WorkoutSetRequest,
} from './workouts/index.js'

const validSet: SetRequest = {
  reps: 5,
  weight: 100,
  time: 0,
  distance: 0,
  notes: null,
  isDropSet: false,
  startDate: '2026-03-29T00:45:00Z',
}

const validGroup: WorkoutSetRequest = {
  exercise: { id: 1 },
  startDate: '2026-03-29T00:30:00Z',
  endDate: '2026-03-29T01:30:00Z',
  notes: null,
  sets: [validSet],
}

const validWorkout = {
  uuid: '4f3f4eae-0b3d-4c48-a779-7e173d31d189',
  startDate: '2026-03-29T00:30:00Z',
  endDate: '2026-03-29T01:30:00+00:00',
  notes: 'session',
  workoutSets: [validGroup],
}

describe('workout and history contracts', () => {
  it('validates UUIDs and rejects timestamps without timezone', () => {
    expect(CreateWorkoutRequestSchema.parse(validWorkout).uuid).toBe(validWorkout.uuid)
    expect(() =>
      CreateWorkoutRequestSchema.parse({ ...validWorkout, uuid: 'not-a-uuid' }),
    ).toThrow()
    expect(() =>
      CreateWorkoutRequestSchema.parse({ ...validWorkout, startDate: '2026-03-29T00:30:00' }),
    ).toThrow()
  })

  it('rejects negative measurements and unknown nested fields', () => {
    expect(() =>
      CreateWorkoutRequestSchema.parse({
        ...validWorkout,
        workoutSets: [
          {
            ...validGroup,
            sets: [{ ...validSet, reps: -1 }],
          },
        ],
      }),
    ).toThrow()
    expect(() =>
      CreateWorkoutRequestSchema.parse({
        ...validWorkout,
        workoutSets: [{ ...validGroup, unexpected: true }],
      }),
    ).toThrow()
  })

  it('validates calendar dates and IANA timezones', () => {
    expect(WorkoutDateParamSchema.parse({ date: '2026-12-31' })).toEqual({ date: '2026-12-31' })
    expect(() => WorkoutDateParamSchema.parse({ date: '2026-12-31T00:00:00Z' })).toThrow()
    expect(IanaTimezoneSchema.parse('Europe/Madrid')).toBe('Europe/Madrid')
    expect(() => IanaTimezoneSchema.parse('Not/AZone')).toThrow()
  })

  it('validates bounded history pagination and allowlisted sorting', () => {
    expect(WorkoutHistoryQuerySchema.parse({})).toMatchObject({
      page: 0,
      pageSize: 20,
      sortBy: 'startDate',
      sortDirection: 'desc',
    })
    expect(
      WorkoutHistoryQuerySchema.parse({ page: '1', pageSize: '5', sortBy: 'id' }),
    ).toMatchObject({
      page: 1,
      pageSize: 5,
      sortBy: 'id',
    })
    expect(() => WorkoutHistoryQuerySchema.parse({ sortBy: 'name' })).toThrow()
    expect(() => WorkoutHistoryQuerySchema.parse({ pageSize: '500' })).toThrow()
  })

  it('validates response timestamps as UTC-capable ISO strings', () => {
    expect(
      WorkoutResponseSchema.parse({
        id: 1,
        uuid: validWorkout.uuid,
        startDate: '2026-03-29T00:30:00Z',
        endDate: '2026-03-29T01:30:00Z',
        notes: null,
        workoutSets: [],
      }),
    ).toMatchObject({ id: 1 })
    expect(() =>
      WorkoutResponseSchema.parse({
        id: 1,
        uuid: validWorkout.uuid,
        startDate: '2026-03-29 00:30:00',
        endDate: '2026-03-29T01:30:00Z',
        workoutSets: [],
      }),
    ).toThrow()
  })
})
