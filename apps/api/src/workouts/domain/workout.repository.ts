import type {
  WorkoutCreated,
  WorkoutDraft,
  WorkoutReadModel,
  WorkoutSetEntryReadModel,
} from './workout.js'

export interface WorkoutRepository {
  createWorkoutGraph(input: WorkoutDraft): Promise<WorkoutCreated>
  listWorkoutStartDatesByUtcRange(input: {
    userId: number
    start: string
    end: string
  }): Promise<string[]>
  getWorkoutGraphByUtcRange(input: {
    userId: number
    start: string
    end: string
  }): Promise<WorkoutReadModel[]>
  deleteWorkoutForUser(workoutId: number, userId: number): Promise<boolean>
  findSetByIdAndUserId(
    setId: number,
    userId: number,
  ): Promise<(WorkoutSetEntryReadModel & { workoutSetId: number }) | null>
  updateSetForUser(
    setId: number,
    userId: number,
    input: Partial<Omit<WorkoutSetEntryReadModel, 'id'>>,
  ): Promise<WorkoutSetEntryReadModel | null>
  deleteSetForUser(
    setId: number,
    userId: number,
  ): Promise<{ deleted: boolean; deletedWorkoutSetId?: number; deletedWorkoutId?: number }>
  getContainingBoundsForSet(setId: number): Promise<{
    groupStartDate: string | null
    groupEndDate: string | null
    workoutStartDate: string
    workoutEndDate: string
  } | null>
}
