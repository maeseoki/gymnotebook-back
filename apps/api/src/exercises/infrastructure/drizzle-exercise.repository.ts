import type { EExerciseType, EMuscleGroup } from '@gymnotebook/contracts';
import { and, eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../../drizzle/schema.js';
import type { CreateExerciseInput, Exercise, ExerciseRepository } from '../domain/exercise.repository.js';

type DB = MySql2Database<typeof schema>;

export class DrizzleExerciseRepository implements ExerciseRepository {
  constructor(private readonly db: DB) {}

  async findByUserId(userId: number): Promise<Exercise[]> {
    const rows = await this.db.select().from(schema.exercises).where(eq(schema.exercises.userId, userId));
    return rows.map(this.mapRow);
  }

  async findById(id: number): Promise<Exercise | null> {
    const rows = await this.db.select().from(schema.exercises).where(eq(schema.exercises.id, id)).limit(1);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Exercise | null> {
    const rows = await this.db
      .select()
      .from(schema.exercises)
      .where(and(eq(schema.exercises.id, id), eq(schema.exercises.userId, userId)))
      .limit(1);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async create(input: CreateExerciseInput): Promise<Exercise> {
    const result = await this.db.insert(schema.exercises).values({
      name: input.name,
      description: input.description ?? null,
      imageId: input.imageId ?? null,
      type: input.type,
      primaryMuscleGroup: input.primaryMuscleGroup,
      secondaryMuscleGroup: input.secondaryMuscleGroup ?? null,
      userId: input.userId,
    });
    const insertId = (result as unknown as { insertId: number }).insertId;
    const created = await this.findById(insertId);
    if (!created) throw new Error('Failed to create exercise');
    return created;
  }

  async update(id: number, input: Partial<CreateExerciseInput>): Promise<Exercise | null> {
    await this.db
      .update(schema.exercises)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description ?? null }),
        ...(input.imageId !== undefined && { imageId: input.imageId ?? null }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.primaryMuscleGroup !== undefined && {
          primaryMuscleGroup: input.primaryMuscleGroup,
        }),
        ...(input.secondaryMuscleGroup !== undefined && {
          secondaryMuscleGroup: input.secondaryMuscleGroup ?? null,
        }),
      })
      .where(eq(schema.exercises.id, id));
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(schema.exercises).where(eq(schema.exercises.id, id));
  }

  async existsById(id: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.exercises.id })
      .from(schema.exercises)
      .where(eq(schema.exercises.id, id))
      .limit(1);
    return rows.length > 0;
  }

  private mapRow(row: typeof schema.exercises.$inferSelect): Exercise {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      imageId: row.imageId ?? null,
      type: row.type as EExerciseType,
      primaryMuscleGroup: row.primaryMuscleGroup as EMuscleGroup,
      secondaryMuscleGroup: (row.secondaryMuscleGroup as EMuscleGroup) ?? null,
      userId: row.userId,
    };
  }
}
