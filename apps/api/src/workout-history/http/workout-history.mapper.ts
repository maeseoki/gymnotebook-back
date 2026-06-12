import type { WorkoutHistoryPage } from '@gymnotebook/contracts'
import { toWorkoutSetResponse } from '../../workouts/http/workout.mapper.js'
import type { WorkoutHistoryPageReadModel } from '../domain/workout-history.repository.js'

export function toWorkoutHistoryPage(page: WorkoutHistoryPageReadModel): WorkoutHistoryPage {
  return {
    content: page.content.map(toWorkoutSetResponse),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    page: page.page,
    pageSize: page.pageSize,
  }
}
