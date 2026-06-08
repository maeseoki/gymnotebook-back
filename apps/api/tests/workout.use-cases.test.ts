import type { CreateWorkoutRequest } from '@gymnotebook/contracts';
import { describe, expect, it } from 'vitest';
import { createWorkout } from '../src/workouts/application/create-workout.js';
import { getWorkoutsByDate } from '../src/workouts/application/get-workouts-by-date.js';
import { listWorkoutDays } from '../src/workouts/application/list-workout-days.js';
import {
  InvalidWorkoutGroupPeriodError,
  InvalidWorkoutPeriodError,
  InvalidWorkoutSetTimeError,
  WorkoutAlreadyExistsError,
  WorkoutExerciseNotAvailableError,
} from '../src/workouts/domain/workout.errors.js';
import type { WorkoutDraft, WorkoutReadModel } from '../src/workouts/domain/workout.js';
import type { WorkoutRepository } from '../src/workouts/domain/workout.repository.js';
import {
  calendarDateUtcRange,
  calendarMonthUtcRange,
  isoInstantToMysqlUtc,
  mysqlUtcToIsoInstant,
} from '../src/workouts/domain/workout-dates.js';
import type { WorkoutExerciseAccess } from '../src/workouts/domain/workout-exercise-access.js';

class FakeWorkoutRepository implements WorkoutRepository {
  created: WorkoutDraft | null = null;
  duplicate = false;
  startDates: string[] = [];
  graphs: WorkoutReadModel[] = [];

  async createWorkoutGraph(input: WorkoutDraft) {
    if (this.duplicate) {
      throw new Error('duplicate uuid');
    }
    this.created = input;
    return { id: 1 };
  }

  async listWorkoutStartDatesByUtcRange() {
    return this.startDates;
  }

  async getWorkoutGraphByUtcRange() {
    return this.graphs;
  }
}

class FakeExerciseAccess implements WorkoutExerciseAccess {
  availableCount = 1;

  async countAvailableExercises() {
    return this.availableCount;
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
  };
}

describe('workout use cases and date policy', () => {
  it('creates workouts with UTC-normalized dates and exercise ownership validation', async () => {
    const workouts = new FakeWorkoutRepository();
    const exerciseAccess = new FakeExerciseAccess();

    await createWorkout(
      { ...validWorkout(), userId: 1 },
      { workouts, exerciseAccess, isDuplicateWorkoutUuidError: () => false },
    );

    expect(workouts.created).toMatchObject({
      userId: 1,
      startDate: '2026-03-29 00:30:00',
      notes: 'workout',
      groups: [{ exerciseId: 10, startDate: '2026-03-29 00:35:00' }],
    });
  });

  it('maps duplicate UUID races and missing or foreign exercises', async () => {
    const workouts = new FakeWorkoutRepository();
    workouts.duplicate = true;
    const exerciseAccess = new FakeExerciseAccess();

    await expect(
      createWorkout(
        { ...validWorkout(), userId: 1 },
        { workouts, exerciseAccess, isDuplicateWorkoutUuidError: () => true },
      ),
    ).rejects.toBeInstanceOf(WorkoutAlreadyExistsError);

    workouts.duplicate = false;
    exerciseAccess.availableCount = 0;
    await expect(
      createWorkout(
        { ...validWorkout(), userId: 1 },
        { workouts, exerciseAccess, isDuplicateWorkoutUuidError: () => false },
      ),
    ).rejects.toBeInstanceOf(WorkoutExerciseNotAvailableError);
  });

  it('rejects invalid workout, group and set periods', async () => {
    const dependencies = {
      workouts: new FakeWorkoutRepository(),
      exerciseAccess: new FakeExerciseAccess(),
      isDuplicateWorkoutUuidError: () => false,
    };

    await expect(
      createWorkout(
        {
          ...validWorkout({ startDate: '2026-03-29T02:00:00Z', endDate: '2026-03-29T01:00:00Z' }),
          userId: 1,
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(InvalidWorkoutPeriodError);
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
    ).rejects.toBeInstanceOf(InvalidWorkoutGroupPeriodError);
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
    ).rejects.toBeInstanceOf(InvalidWorkoutSetTimeError);
  });

  it('converts instants and calendar ranges without server timezone dependence', () => {
    expect(isoInstantToMysqlUtc('2026-03-29T01:30:00+02:00')).toBe('2026-03-28 23:30:00');
    expect(mysqlUtcToIsoInstant('2026-03-28 23:30:00')).toBe('2026-03-28T23:30:00Z');
    expect(calendarDateUtcRange('2026-03-29', 'Europe/Madrid')).toEqual({
      start: '2026-03-28 23:00:00',
      end: '2026-03-29 22:00:00',
    });
    expect(calendarDateUtcRange('2026-10-25', 'Europe/Madrid')).toEqual({
      start: '2026-10-24 22:00:00',
      end: '2026-10-25 23:00:00',
    });
    expect(calendarMonthUtcRange(2026, 1, 'Europe/Madrid')).toEqual({
      start: '2025-12-31 23:00:00',
      end: '2026-01-31 23:00:00',
    });
  });

  it('lists workout days and fetches workouts through timezone ranges', async () => {
    const workouts = new FakeWorkoutRepository();
    workouts.startDates = ['2026-03-28 23:30:00', '2026-03-29 21:00:00'];
    await expect(
      listWorkoutDays({ userId: 1, month: 3, year: 2026, timezone: 'Europe/Madrid' }, workouts),
    ).resolves.toEqual([29]);

    workouts.graphs = [
      {
        id: 1,
        uuid: validWorkout().uuid,
        startDate: 'x',
        endDate: 'y',
        notes: null,
        workoutSets: [],
      },
    ];
    await expect(
      getWorkoutsByDate({ userId: 1, date: '2026-03-29', timezone: 'Europe/Madrid' }, workouts),
    ).resolves.toHaveLength(1);
  });
});
