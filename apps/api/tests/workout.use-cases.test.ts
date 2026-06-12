import type { CreateWorkoutRequest } from '@gymnotebook/contracts'
import { describe, expect, it, vi } from 'vitest'
import { createWorkout } from '../src/workouts/application/create-workout.js'
import { deleteWorkout } from '../src/workouts/application/delete-workout.js'
import { deleteWorkoutSet } from '../src/workouts/application/delete-workout-set.js'
import { getWorkoutsByDate } from '../src/workouts/application/get-workouts-by-date.js'
import { listWorkoutDays } from '../src/workouts/application/list-workout-days.js'
import { updateWorkoutSet } from '../src/workouts/application/update-workout-set.js'
import {
  InvalidWorkoutGroupPeriodError,
  InvalidWorkoutPeriodError,
  InvalidWorkoutSetTimeError,
  SetNotFoundError,
  WorkoutAlreadyExistsError,
  WorkoutExerciseNotAvailableError,
  WorkoutNotFoundError,
} from '../src/workouts/domain/workout.errors.js'
import type {
  WorkoutDraft,
  WorkoutReadModel,
  WorkoutSetEntryReadModel,
} from '../src/workouts/domain/workout.js'
import type { WorkoutRepository } from '../src/workouts/domain/workout.repository.js'
import {
  calendarDateUtcRange,
  calendarMonthUtcRange,
  isoInstantToMysqlUtc,
  mysqlUtcToIsoInstant,
} from '../src/workouts/domain/workout-dates.js'
import type { WorkoutExerciseAccess } from '../src/workouts/domain/workout-exercise-access.js'

class FakeWorkoutRepository implements WorkoutRepository {
  created: WorkoutDraft | null = null
  duplicate = false
  startDates: string[] = []
  graphs: WorkoutReadModel[] = []

  deletedWorkout = false
  setByIdAndUserId: (WorkoutSetEntryReadModel & { workoutSetId: number }) | null = null
  updatedSet: WorkoutSetEntryReadModel | null = null
  deletedSetResult: {
    deleted: boolean
    deletedWorkoutSetId?: number
    deletedWorkoutId?: number
  } = { deleted: false }
  containingBounds: {
    groupStartDate: string | null
    groupEndDate: string | null
    workoutStartDate: string
    workoutEndDate: string
  } | null = null

  deleteWorkoutCalls: Array<{ workoutId: number; userId: number }> = []
  findSetCalls: Array<{ setId: number; userId: number }> = []
  updateSetCalls: Array<{
    setId: number
    userId: number
    input: Partial<Omit<WorkoutSetEntryReadModel, 'id'>>
  }> = []
  deleteSetCalls: Array<{ setId: number; userId: number }> = []
  containingBoundsCalls: number[] = []

  async createWorkoutGraph(input: WorkoutDraft) {
    if (this.duplicate) {
      throw new Error('duplicate uuid')
    }
    this.created = input
    return { id: 1 }
  }

  async listWorkoutStartDatesByUtcRange() {
    return this.startDates
  }

  async getWorkoutGraphByUtcRange() {
    return this.graphs
  }

  async deleteWorkoutForUser(workoutId: number, userId: number) {
    this.deleteWorkoutCalls.push({ workoutId, userId })
    return this.deletedWorkout
  }

  async findSetByIdAndUserId(setId: number, userId: number) {
    this.findSetCalls.push({ setId, userId })
    return this.setByIdAndUserId
  }

  async updateSetForUser(
    setId: number,
    userId: number,
    input: Partial<Omit<WorkoutSetEntryReadModel, 'id'>>,
  ) {
    this.updateSetCalls.push({ setId, userId, input })
    return this.updatedSet
  }

  async deleteSetForUser(setId: number, userId: number) {
    this.deleteSetCalls.push({ setId, userId })
    return this.deletedSetResult
  }

  async getContainingBoundsForSet(setId: number) {
    this.containingBoundsCalls.push(setId)
    return this.containingBounds
  }
}

class FakeExerciseAccess implements WorkoutExerciseAccess {
  availableCount = 1

  async countAvailableExercises() {
    return this.availableCount
  }
}

function validWorkout(overrides: Partial<CreateWorkoutRequest> = {}): CreateWorkoutRequest {
  return {
    uuid: '4f3f4eae-0b3d-4c48-a779-7e173d31d189',
    startDate: '2026-03-29T00:30:00Z',
    endDate: '2026-03-29T01:30:00Z',
    notes: ' workout ',
    workoutSets: [
      {
        exercise: { id: 10 },
        startDate: '2026-03-29T00:35:00Z',
        endDate: '2026-03-29T01:20:00Z',
        notes: ' group ',
        sets: [
          {
            reps: 5,
            weight: 100,
            time: 0,
            distance: 0,
            notes: ' set ',
            isDropSet: false,
            startDate: '2026-03-29T00:45:00Z',
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('workout use cases and date policy', () => {
  it('creates workouts with UTC-normalized dates and exercise ownership validation', async () => {
    const workouts = new FakeWorkoutRepository()
    const exerciseAccess = new FakeExerciseAccess()

    await createWorkout(
      { ...validWorkout(), userId: 1 },
      { workouts, exerciseAccess, isDuplicateWorkoutUuidError: () => false },
    )

    expect(workouts.created).toMatchObject({
      userId: 1,
      startDate: '2026-03-29 00:30:00',
      notes: 'workout',
      groups: [{ exerciseId: 10, startDate: '2026-03-29 00:35:00' }],
    })
  })

  it('maps duplicate UUID races and missing or foreign exercises', async () => {
    const workouts = new FakeWorkoutRepository()
    workouts.duplicate = true
    const exerciseAccess = new FakeExerciseAccess()

    await expect(
      createWorkout(
        { ...validWorkout(), userId: 1 },
        { workouts, exerciseAccess, isDuplicateWorkoutUuidError: () => true },
      ),
    ).rejects.toBeInstanceOf(WorkoutAlreadyExistsError)

    workouts.duplicate = false
    exerciseAccess.availableCount = 0
    await expect(
      createWorkout(
        { ...validWorkout(), userId: 1 },
        { workouts, exerciseAccess, isDuplicateWorkoutUuidError: () => false },
      ),
    ).rejects.toBeInstanceOf(WorkoutExerciseNotAvailableError)
  })

  it('rejects invalid workout, group and set periods', async () => {
    const dependencies = {
      workouts: new FakeWorkoutRepository(),
      exerciseAccess: new FakeExerciseAccess(),
      isDuplicateWorkoutUuidError: () => false,
    }

    await expect(
      createWorkout(
        {
          ...validWorkout({ startDate: '2026-03-29T02:00:00Z', endDate: '2026-03-29T01:00:00Z' }),
          userId: 1,
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(InvalidWorkoutPeriodError)
    await expect(
      createWorkout(
        {
          ...validWorkout({
            workoutSets: [
              {
                ...validWorkout().workoutSets[0],
                startDate: '2026-03-29T02:00:00Z',
                endDate: '2026-03-29T01:00:00Z',
              },
            ],
          }),
          userId: 1,
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(InvalidWorkoutGroupPeriodError)
    await expect(
      createWorkout(
        {
          ...validWorkout({
            workoutSets: [
              {
                ...validWorkout().workoutSets[0],
                sets: [
                  { ...validWorkout().workoutSets[0].sets[0], startDate: '2026-03-29T02:00:00Z' },
                ],
              },
            ],
          }),
          userId: 1,
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(InvalidWorkoutSetTimeError)
  })

  it('converts instants and calendar ranges without server timezone dependence', () => {
    expect(isoInstantToMysqlUtc('2026-03-29T01:30:00+02:00')).toBe('2026-03-28 23:30:00')
    expect(mysqlUtcToIsoInstant('2026-03-28 23:30:00')).toBe('2026-03-28T23:30:00Z')
    expect(calendarDateUtcRange('2026-03-29', 'Europe/Madrid')).toEqual({
      start: '2026-03-28 23:00:00',
      end: '2026-03-29 22:00:00',
    })
    expect(calendarDateUtcRange('2026-10-25', 'Europe/Madrid')).toEqual({
      start: '2026-10-24 22:00:00',
      end: '2026-10-25 23:00:00',
    })
    expect(calendarMonthUtcRange(2026, 1, 'Europe/Madrid')).toEqual({
      start: '2025-12-31 23:00:00',
      end: '2026-01-31 23:00:00',
    })
  })

  it('lists workout days and fetches workouts through timezone ranges', async () => {
    const workouts = new FakeWorkoutRepository()
    workouts.startDates = ['2026-03-28 23:30:00', '2026-03-29 21:00:00']
    await expect(
      listWorkoutDays({ userId: 1, month: 3, year: 2026, timezone: 'Europe/Madrid' }, workouts),
    ).resolves.toEqual([29])

    workouts.graphs = [
      {
        id: 1,
        uuid: validWorkout().uuid,
        startDate: 'x',
        endDate: 'y',
        notes: null,
        workoutSets: [],
      },
    ]
    await expect(
      getWorkoutsByDate({ userId: 1, date: '2026-03-29', timezone: 'Europe/Madrid' }, workouts),
    ).resolves.toHaveLength(1)
  })

  describe('workout mutation use cases', () => {
    const createWorkoutRepositoryMock = (
      overrides: Partial<WorkoutRepository> = {},
    ): WorkoutRepository =>
      ({
        createWorkoutGraph: vi.fn(),
        listWorkoutStartDatesByUtcRange: vi.fn(),
        getWorkoutGraphByUtcRange: vi.fn(),
        deleteWorkoutForUser: vi.fn(),
        findSetByIdAndUserId: vi.fn(),
        updateSetForUser: vi.fn(),
        deleteSetForUser: vi.fn(),
        getContainingBoundsForSet: vi.fn(),
        ...overrides,
      }) as WorkoutRepository

    it('deletes an owned workout', async () => {
      const workouts = createWorkoutRepositoryMock({
        deleteWorkoutForUser: vi.fn().mockResolvedValue(true),
      })

      await expect(deleteWorkout({ workoutId: 10, userId: 1 }, workouts)).resolves.toBeUndefined()

      expect(workouts.deleteWorkoutForUser).toHaveBeenCalledWith(10, 1)
    })

    it('throws when deleting a missing or foreign workout', async () => {
      const workouts = createWorkoutRepositoryMock({
        deleteWorkoutForUser: vi.fn().mockResolvedValue(false),
      })

      await expect(deleteWorkout({ workoutId: 10, userId: 1 }, workouts)).rejects.toBeInstanceOf(
        WorkoutNotFoundError,
      )
    })

    it('deletes an owned workout set', async () => {
      const workouts = createWorkoutRepositoryMock({
        deleteSetForUser: vi.fn().mockResolvedValue({ deleted: true }),
      })

      await expect(deleteWorkoutSet({ setId: 20, userId: 1 }, workouts)).resolves.toBeUndefined()

      expect(workouts.deleteSetForUser).toHaveBeenCalledWith(20, 1)
    })

    it('throws when deleting a missing or foreign workout set', async () => {
      const workouts = createWorkoutRepositoryMock({
        deleteSetForUser: vi.fn().mockResolvedValue({ deleted: false }),
      })

      await expect(deleteWorkoutSet({ setId: 20, userId: 1 }, workouts)).rejects.toBeInstanceOf(
        SetNotFoundError,
      )
    })

    it('updates an owned workout set and validates its bounds', async () => {
      const workouts = createWorkoutRepositoryMock({
        findSetByIdAndUserId: vi.fn().mockResolvedValue({
          id: 20,
          workoutSetId: 30,
          reps: 8,
          weight: 80000,
          time: 0,
          distance: 0,
          notes: null,
          isDropSet: false,
          startDate: '2026-06-12T10:00:00.000Z',
        }),
        getContainingBoundsForSet: vi.fn().mockResolvedValue({
          groupStartDate: '2026-06-12 10:00:00',
          groupEndDate: '2026-06-12 11:00:00',
          workoutStartDate: '2026-06-12 10:00:00',
          workoutEndDate: '2026-06-12 11:00:00',
        }),
        updateSetForUser: vi.fn().mockResolvedValue({
          id: 20,
          reps: 10,
          weight: 82500,
          time: 90,
          distance: 200,
          notes: 'Updated',
          isDropSet: true,
          startDate: '2026-06-12T10:30:00.000Z',
        }),
      })

      const result = await updateWorkoutSet(
        {
          setId: 20,
          userId: 1,
          reps: 10,
          weight: 82500,
          time: 90,
          distance: 200,
          notes: ' Updated ',
          isDropSet: true,
          startDate: '2026-06-12T10:30:00.000Z',
        },
        workouts,
      )

      expect(result).toMatchObject({
        id: 20,
        reps: 10,
        weight: 82500,
        notes: 'Updated',
        isDropSet: true,
      })

      expect(workouts.updateSetForUser).toHaveBeenCalledWith(
        20,
        1,
        expect.objectContaining({
          reps: 10,
          weight: 82500,
          time: 90,
          distance: 200,
          notes: 'Updated',
          isDropSet: true,
        }),
      )
    })

    it('throws when updating a missing or foreign workout set', async () => {
      const workouts = createWorkoutRepositoryMock({
        findSetByIdAndUserId: vi.fn().mockResolvedValue(null),
      })

      await expect(
        updateWorkoutSet({ setId: 20, userId: 1, reps: 10 }, workouts),
      ).rejects.toBeInstanceOf(SetNotFoundError)
    })

    it('rejects workout set start dates outside containing bounds', async () => {
      const workouts = createWorkoutRepositoryMock({
        findSetByIdAndUserId: vi.fn().mockResolvedValue({
          id: 20,
          workoutSetId: 30,
          reps: 8,
          weight: 80000,
          time: 0,
          distance: 0,
          notes: null,
          isDropSet: false,
          startDate: '2026-06-12T10:00:00.000Z',
        }),
        getContainingBoundsForSet: vi.fn().mockResolvedValue({
          groupStartDate: '2026-06-12 10:00:00',
          groupEndDate: '2026-06-12 11:00:00',
          workoutStartDate: '2026-06-12 10:00:00',
          workoutEndDate: '2026-06-12 11:00:00',
        }),
      })

      await expect(
        updateWorkoutSet(
          {
            setId: 20,
            userId: 1,
            startDate: '2026-06-12T12:00:00.000Z',
          },
          workouts,
        ),
      ).rejects.toBeInstanceOf(InvalidWorkoutSetTimeError)
    })
  })
})
