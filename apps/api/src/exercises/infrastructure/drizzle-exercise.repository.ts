import { and, asc, eq } from 'drizzle-orm';
import type { ResultSetHeader } from 'mysql2';
import * as schema from '../../../drizzle/schema.js';
import type { DbExecutor } from '../../shared/transaction.js';
import type { Exercise, ExerciseDraft, ExerciseUpdate } from '../domain/exercise.js';
import type { ExerciseRepository } from '../domain/exercise.repository.js';

export class DrizzleExerciseRepository implements ExerciseRepository {
  constructor(private readonly db: DbExecutor) {}

  async listByUser(userId: number): Promise<Exercise[]> {
    const rows = await this.db
      .select()
      .from(schema.exercises)
      .where(eq(schema.exercises.userId, userId))
      .orderBy(asc(schema.exercises.name), asc(schema.exercises.id));
    return rows.map(mapRow);
  }

  async findById(id: number): Promise<Exercise | null> {
    const rows = await this.db
      .select()
      .from(schema.exercises)
      .where(eq(schema.exercises.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByIdForUser(id: number, userId: number): Promise<Exercise | null> {
    const rows = await this.db
      .select()
      .from(schema.exercises)
      .where(and(eq(schema.exercises.id, id), eq(schema.exercises.userId, userId)))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Exercise | null> {
    return this.findByIdForUser(id, userId);
  }

  async create(input: ExerciseDraft): Promise<Exercise> {
    const inserted = await this.db
      .insert(schema.exercises)
      .values({
        name: input.name,
        description: input.description,
        imageId: input.imageId,
        type: input.type,
        primaryMuscleGroup: input.primaryMuscleGroup,
        secondaryMuscleGroup: input.secondaryMuscleGroup,
        userId: input.userId,
      })
      .$returningId();
    const id = inserted[0]?.id;
    if (typeof id !== 'number') {
      throw new Error('Failed to create exercise');
    }
    const created = await this.findByIdForUser(id, input.userId);
    if (!created) {
      throw new Error('Failed to create exercise');
    }
    return created;
  }

  async updateForUser(id: number, userId: number, input: ExerciseUpdate): Promise<Exercise | null> {
    await this.db
      .update(schema.exercises)
      .set({
        name: input.name,
        description: input.description,
        imageId: input.imageId,
        type: input.type,
        primaryMuscleGroup: input.primaryMuscleGroup,
        secondaryMuscleGroup: input.secondaryMuscleGroup,
      })
      .where(and(eq(schema.exercises.id, id), eq(schema.exercises.userId, userId)));

    return this.findByIdForUser(id, userId);
  }

  async deleteForUser(id: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(schema.exercises)
      .where(and(eq(schema.exercises.id, id), eq(schema.exercises.userId, userId)));
    return getAffectedRows(result) > 0;
  }
}

function mapRow(row: typeof schema.exercises.$inferSelect): Exercise {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageId: row.imageId,
    type: row.type,
    primaryMuscleGroup: row.primaryMuscleGroup,
    secondaryMuscleGroup: row.secondaryMuscleGroup,
    userId: row.userId,
  };
}

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const [header] = result;
    return getAffectedRows(header);
  }
  const header = result as Partial<ResultSetHeader>;
  return typeof header.affectedRows === 'number' ? header.affectedRows : 0;
}
