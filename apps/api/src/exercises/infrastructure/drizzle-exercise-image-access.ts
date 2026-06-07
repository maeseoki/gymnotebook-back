import { and, eq } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema.js';
import type { DbExecutor } from '../../shared/transaction.js';
import type { ExerciseImageAccess } from '../domain/exercise-image-access.js';

export class DrizzleExerciseImageAccess implements ExerciseImageAccess {
  constructor(private readonly db: DbExecutor) {}

  async isImageAvailableForUser(imageId: number, userId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.imageData.id })
      .from(schema.imageData)
      .where(and(eq(schema.imageData.id, imageId), eq(schema.imageData.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }
}
