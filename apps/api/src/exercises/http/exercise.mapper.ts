import type { ExerciseResponse } from '@gymnotebook/contracts'
import type { Exercise } from '../domain/exercise.js'

export function toExerciseResponse(exercise: Exercise): ExerciseResponse {
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    imageId: exercise.imageId,
    type: exercise.type,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    secondaryMuscleGroup: exercise.secondaryMuscleGroup,
  }
}
