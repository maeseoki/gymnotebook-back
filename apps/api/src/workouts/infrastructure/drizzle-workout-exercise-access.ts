import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema.js';
import type { DbExecutor } from '../../shared/transaction.js';
import type { WorkoutExerciseAccess } from '../domain/workout-exercise-access.js';

export class DrizzleWorkoutExerciseAccess implements WorkoutExerciseAccess {
  constructor(private readonly db: DbExecutor) {}

  async countAvailableExercises(userId: number, exerciseIds: readonly number[]): Promise<number> {
    if (exerciseIds.length === 0) {
      return 0;
    }
    const rows = await this.db
      .select({ id: schema.exercises.id })
      .from(schema.exercises)
      .where(
        and(eq(schema.exercises.userId, userId), inArray(schema.exercises.id, [...exerciseIds])),
      );
    return rows.length;
  }
}
