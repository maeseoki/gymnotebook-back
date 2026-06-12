import type { WorkoutGroupReadModel } from '../../workouts/domain/workout.js'

export type WorkoutHistorySortBy = 'startDate' | 'endDate' | 'id'
export type WorkoutHistorySortDirection = 'asc' | 'desc'

export interface WorkoutHistoryPageReadModel {
  content: WorkoutGroupReadModel[]
  totalElements: number
  totalPages: number
  page: number
  pageSize: number
}

export interface WorkoutHistoryRepository {
  getExerciseHistoryPage(input: {
    userId: number
    exerciseId: number
    page: number
    pageSize: number
    sortBy: WorkoutHistorySortBy
    sortDirection: WorkoutHistorySortDirection
  }): Promise<WorkoutHistoryPageReadModel | null>
}
