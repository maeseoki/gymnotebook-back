import type { SetResponse, WorkoutResponse, WorkoutSetResponse } from '@gymnotebook/contracts'
import {
  toExerciseResponse,
  type WorkoutGroupReadModel,
  type WorkoutReadModel,
  type WorkoutSetEntryReadModel,
} from '../domain/workout.js'

export function toWorkoutResponse(workout: WorkoutReadModel): WorkoutResponse {
  return {
    id: workout.id,
    uuid: workout.uuid,
    startDate: workout.startDate,
    endDate: workout.endDate,
    notes: workout.notes,
    workoutSets: workout.workoutSets.map(toWorkoutSetResponse),
  }
}

export function toWorkoutSetResponse(group: WorkoutGroupReadModel): WorkoutSetResponse {
  return {
    id: group.id,
    startDate: group.startDate,
    endDate: group.endDate,
    notes: group.notes,
    exercise: toExerciseResponse(group.exercise),
    sets: group.sets.map(toSetResponse),
  }
}

function toSetResponse(set: WorkoutSetEntryReadModel): SetResponse {
  return {
    id: set.id,
    reps: set.reps,
    weight: set.weight,
    time: set.time,
    distance: set.distance,
    notes: set.notes,
    isDropSet: set.isDropSet,
    startDate: set.startDate,
  }
}
