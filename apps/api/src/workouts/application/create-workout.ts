import type { CreateWorkoutRequest } from '@gymnotebook/contracts'
import {
  InvalidWorkoutGroupPeriodError,
  InvalidWorkoutPeriodError,
  InvalidWorkoutSetTimeError,
  WorkoutAlreadyExistsError,
  WorkoutExerciseNotAvailableError,
} from '../domain/workout.errors.js'
import type { WorkoutRepository } from '../domain/workout.repository.js'
import { compareIsoInstants, isoInstantToMysqlUtc } from '../domain/workout-dates.js'
import type { WorkoutExerciseAccess } from '../domain/workout-exercise-access.js'

export async function createWorkout(
  input: CreateWorkoutRequest & { userId: number },
  dependencies: {
    workouts: WorkoutRepository
    exerciseAccess: WorkoutExerciseAccess
    isDuplicateWorkoutUuidError: (error: unknown) => boolean
  },
): Promise<void> {
  validateWorkoutPeriod(input.startDate, input.endDate)
  for (const group of input.workoutSets) {
    validateGroupPeriod(group.startDate ?? null, group.endDate ?? null)
    for (const set of group.sets) {
      validateSetTime(
        set.startDate ?? null,
        group.startDate ?? input.startDate,
        group.endDate ?? input.endDate,
      )
    }
  }

  const uniqueExerciseIds = [...new Set(input.workoutSets.map((group) => group.exercise.id))]
  if (uniqueExerciseIds.length > 0) {
    const availableCount = await dependencies.exerciseAccess.countAvailableExercises(
      input.userId,
      uniqueExerciseIds,
    )
    if (availableCount !== uniqueExerciseIds.length) {
      throw new WorkoutExerciseNotAvailableError()
    }
  }

  try {
    await dependencies.workouts.createWorkoutGraph({
      uuid: input.uuid,
      userId: input.userId,
      startDate: isoInstantToMysqlUtc(input.startDate),
      endDate: isoInstantToMysqlUtc(input.endDate),
      notes: normalizeNullableText(input.notes ?? null),
      groups: input.workoutSets.map((group) => ({
        exerciseId: group.exercise.id,
        startDate: group.startDate ? isoInstantToMysqlUtc(group.startDate) : null,
        endDate: group.endDate ? isoInstantToMysqlUtc(group.endDate) : null,
        notes: normalizeNullableText(group.notes ?? null),
        sets: group.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight,
          time: set.time,
          distance: set.distance,
          notes: normalizeNullableText(set.notes ?? null),
          isDropSet: set.isDropSet,
          startDate: set.startDate ? isoInstantToMysqlUtc(set.startDate) : null,
        })),
      })),
    })
  } catch (error) {
    if (dependencies.isDuplicateWorkoutUuidError(error)) {
      throw new WorkoutAlreadyExistsError()
    }
    throw error
  }
}

function validateWorkoutPeriod(startDate: string, endDate: string): void {
  if (compareIsoInstants(endDate, startDate) < 0) {
    throw new InvalidWorkoutPeriodError()
  }
}

function validateGroupPeriod(startDate: string | null, endDate: string | null): void {
  if (startDate && endDate && compareIsoInstants(endDate, startDate) < 0) {
    throw new InvalidWorkoutGroupPeriodError()
  }
}

function validateSetTime(
  setStartDate: string | null,
  containingStartDate: string,
  containingEndDate: string,
): void {
  if (!setStartDate) {
    return
  }
  if (
    compareIsoInstants(setStartDate, containingStartDate) < 0 ||
    compareIsoInstants(setStartDate, containingEndDate) > 0
  ) {
    throw new InvalidWorkoutSetTimeError()
  }
}

function normalizeNullableText(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}
