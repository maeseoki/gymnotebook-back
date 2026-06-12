import type { UpdateWorkoutSetRequest } from '@gymnotebook/contracts'
import { InvalidWorkoutSetTimeError, SetNotFoundError } from '../domain/workout.errors.js'
import type { WorkoutSetEntryReadModel } from '../domain/workout.js'
import type { WorkoutRepository } from '../domain/workout.repository.js'
import {
  compareIsoInstants,
  isoInstantToMysqlUtc,
  mysqlUtcToIsoInstant,
} from '../domain/workout-dates.js'

export async function updateWorkoutSet(
  input: UpdateWorkoutSetRequest & { setId: number; userId: number },
  workouts: WorkoutRepository,
): Promise<WorkoutSetEntryReadModel> {
  const owned = await workouts.findSetByIdAndUserId(input.setId, input.userId)
  if (!owned) {
    throw new SetNotFoundError()
  }

  if (input.startDate) {
    const bounds = await workouts.getContainingBoundsForSet(input.setId)
    if (bounds) {
      const groupStart = bounds.groupStartDate ? mysqlUtcToIsoInstant(bounds.groupStartDate) : null
      const groupEnd = bounds.groupEndDate ? mysqlUtcToIsoInstant(bounds.groupEndDate) : null
      const workoutStart = mysqlUtcToIsoInstant(bounds.workoutStartDate) ?? ''
      const workoutEnd = mysqlUtcToIsoInstant(bounds.workoutEndDate) ?? ''

      const containingStartDate = groupStart ?? workoutStart
      const containingEndDate = groupEnd ?? workoutEnd

      if (
        compareIsoInstants(input.startDate, containingStartDate) < 0 ||
        compareIsoInstants(input.startDate, containingEndDate) > 0
      ) {
        throw new InvalidWorkoutSetTimeError()
      }
    }
  }

  const updatePayload: Partial<Omit<WorkoutSetEntryReadModel, 'id'>> = {}
  if (input.reps !== undefined) updatePayload.reps = input.reps
  if (input.weight !== undefined) updatePayload.weight = input.weight
  if (input.time !== undefined) updatePayload.time = input.time
  if (input.distance !== undefined) updatePayload.distance = input.distance
  if (input.isDropSet !== undefined) updatePayload.isDropSet = input.isDropSet
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes ? normalizeNullableText(input.notes) : null
  }
  if (input.startDate !== undefined) {
    updatePayload.startDate = input.startDate ? isoInstantToMysqlUtc(input.startDate) : null
  }

  const updated = await workouts.updateSetForUser(input.setId, input.userId, updatePayload)
  if (!updated) {
    throw new SetNotFoundError()
  }

  return updated
}

function normalizeNullableText(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}
