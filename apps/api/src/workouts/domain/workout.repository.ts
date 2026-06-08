import type { WorkoutCreated, WorkoutDraft, WorkoutReadModel } from './workout.js';

export interface WorkoutRepository {
  createWorkoutGraph(input: WorkoutDraft): Promise<WorkoutCreated>;
  listWorkoutStartDatesByUtcRange(input: {
    userId: number;
    start: string;
    end: string;
  }): Promise<string[]>;
  getWorkoutGraphByUtcRange(input: {
    userId: number;
    start: string;
    end: string;
  }): Promise<WorkoutReadModel[]>;
}
