import { and, asc, count, eq, gte, inArray, lt } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2'
import * as schema from '../../../drizzle/schema.js'
import type { Database } from '../../shared/db.js'
import type { DbExecutor, Transaction } from '../../shared/transaction.js'
import { inTransaction } from '../../shared/transaction.js'
import type {
  WorkoutCreated,
  WorkoutDraft,
  WorkoutGroupReadModel,
  WorkoutReadModel,
  WorkoutSetEntryReadModel,
} from '../domain/workout.js'
import type { WorkoutRepository } from '../domain/workout.repository.js'
import { mysqlUtcToIsoInstant } from '../domain/workout-dates.js'

export class DrizzleWorkoutRepository implements WorkoutRepository {
  constructor(private readonly db: DbExecutor) {}

  async createWorkoutGraph(input: WorkoutDraft): Promise<WorkoutCreated> {
    if (isDatabase(this.db)) {
      return inTransaction(this.db, (tx) => this.createWorkoutGraphInTransaction(tx, input))
    }
    return this.createWorkoutGraphInTransaction(this.db, input)
  }

  async listWorkoutStartDatesByUtcRange(input: {
    userId: number
    start: string
    end: string
  }): Promise<string[]> {
    const rows = await this.db
      .select({ startDate: schema.workouts.startDate })
      .from(schema.workouts)
      .where(
        and(
          eq(schema.workouts.userId, input.userId),
          gte(schema.workouts.startDate, input.start),
          lt(schema.workouts.startDate, input.end),
        ),
      )
      .orderBy(asc(schema.workouts.startDate), asc(schema.workouts.id))
    return rows.flatMap((row) => (row.startDate ? [row.startDate] : []))
  }

  async getWorkoutGraphByUtcRange(input: {
    userId: number
    start: string
    end: string
  }): Promise<WorkoutReadModel[]> {
    const workoutRows = await this.db
      .select()
      .from(schema.workouts)
      .where(
        and(
          eq(schema.workouts.userId, input.userId),
          gte(schema.workouts.startDate, input.start),
          lt(schema.workouts.startDate, input.end),
        ),
      )
      .orderBy(asc(schema.workouts.startDate), asc(schema.workouts.id))

    const workoutIds = workoutRows.map((workout) => workout.id)
    if (workoutIds.length === 0) {
      return []
    }

    const groupRows = await this.db
      .select({
        group: schema.workoutSets,
        exercise: schema.exercises,
      })
      .from(schema.workoutSets)
      .innerJoin(schema.exercises, eq(schema.exercises.id, schema.workoutSets.exerciseId))
      .where(inArray(schema.workoutSets.workoutId, workoutIds))
      .orderBy(asc(schema.workoutSets.startDate), asc(schema.workoutSets.id))

    const groupIds = groupRows.map((row) => row.group.id)
    const setRows =
      groupIds.length === 0
        ? []
        : await this.db
            .select()
            .from(schema.sets)
            .where(inArray(schema.sets.workoutSetId, groupIds))
            .orderBy(asc(schema.sets.startDate), asc(schema.sets.id))

    const setsByGroupId = new Map<number, WorkoutSetEntryReadModel[]>()
    for (const row of setRows) {
      const entries = setsByGroupId.get(row.workoutSetId) ?? []
      entries.push({
        id: row.id,
        reps: row.reps,
        weight: row.weight,
        time: row.time,
        distance: row.distance,
        notes: row.notes,
        isDropSet: row.isDropSet,
        startDate: mysqlUtcToIsoInstant(row.startDate),
      })
      setsByGroupId.set(row.workoutSetId, entries)
    }

    const groupsByWorkoutId = new Map<number, WorkoutGroupReadModel[]>()
    for (const row of groupRows) {
      const groups = groupsByWorkoutId.get(row.group.workoutId) ?? []
      groups.push({
        id: row.group.id,
        workoutId: row.group.workoutId,
        startDate: mysqlUtcToIsoInstant(row.group.startDate),
        endDate: mysqlUtcToIsoInstant(row.group.endDate),
        notes: row.group.notes,
        exercise: {
          id: row.exercise.id,
          name: row.exercise.name,
          description: row.exercise.description,
          imageId: row.exercise.imageId,
          type: row.exercise.type,
          primaryMuscleGroup: row.exercise.primaryMuscleGroup,
          secondaryMuscleGroup: row.exercise.secondaryMuscleGroup,
        },
        sets: setsByGroupId.get(row.group.id) ?? [],
      })
      groupsByWorkoutId.set(row.group.workoutId, groups)
    }

    return workoutRows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      startDate: mysqlUtcToIsoInstant(row.startDate) ?? '',
      endDate: mysqlUtcToIsoInstant(row.endDate) ?? '',
      notes: row.notes,
      workoutSets: groupsByWorkoutId.get(row.id) ?? [],
    }))
  }

  private async createWorkoutGraphInTransaction(
    tx: Transaction,
    input: WorkoutDraft,
  ): Promise<WorkoutCreated> {
    const insertedWorkout = await tx
      .insert(schema.workouts)
      .values({
        uuid: input.uuid,
        userId: input.userId,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes,
      })
      .$returningId()
    const workoutId = insertedWorkout[0]?.id
    if (typeof workoutId !== 'number') {
      throw new Error('Failed to create workout')
    }

    if (input.groups.length === 0) {
      return { id: workoutId }
    }

    const insertedGroups = await tx
      .insert(schema.workoutSets)
      .values(
        input.groups.map((group) => ({
          workoutId,
          exerciseId: group.exerciseId,
          startDate: group.startDate,
          endDate: group.endDate,
          notes: group.notes,
        })),
      )
      .$returningId()

    const setValues = input.groups.flatMap((group, index) => {
      const workoutSetId = insertedGroups[index]?.id
      if (typeof workoutSetId !== 'number') {
        throw new Error('Failed to create workout group')
      }
      return group.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight,
        time: set.time,
        distance: set.distance,
        notes: set.notes,
        isDropSet: set.isDropSet,
        workoutSetId,
        startDate: set.startDate,
      }))
    })

    if (setValues.length > 0) {
      await tx.insert(schema.sets).values(setValues)
    }

    return { id: workoutId }
  }

  async deleteWorkoutForUser(workoutId: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(schema.workouts)
      .where(and(eq(schema.workouts.id, workoutId), eq(schema.workouts.userId, userId)))
    return getAffectedRows(result) > 0
  }

  async findSetByIdAndUserId(
    setId: number,
    userId: number,
  ): Promise<(WorkoutSetEntryReadModel & { workoutSetId: number }) | null> {
    const rows = await this.db
      .select({
        id: schema.sets.id,
        reps: schema.sets.reps,
        weight: schema.sets.weight,
        time: schema.sets.time,
        distance: schema.sets.distance,
        notes: schema.sets.notes,
        isDropSet: schema.sets.isDropSet,
        startDate: schema.sets.startDate,
        workoutSetId: schema.sets.workoutSetId,
      })
      .from(schema.sets)
      .innerJoin(schema.workoutSets, eq(schema.workoutSets.id, schema.sets.workoutSetId))
      .innerJoin(schema.workouts, eq(schema.workouts.id, schema.workoutSets.workoutId))
      .where(and(eq(schema.sets.id, setId), eq(schema.workouts.userId, userId)))
      .limit(1)

    const row = rows[0]
    if (!row) {
      return null
    }

    return {
      id: row.id,
      reps: row.reps,
      weight: row.weight,
      time: row.time,
      distance: row.distance,
      notes: row.notes,
      isDropSet: row.isDropSet,
      startDate: mysqlUtcToIsoInstant(row.startDate),
      workoutSetId: row.workoutSetId,
    }
  }

  async updateSetForUser(
    setId: number,
    userId: number,
    input: Partial<Omit<WorkoutSetEntryReadModel, 'id'>>,
  ): Promise<WorkoutSetEntryReadModel | null> {
    const owned = await this.findSetByIdAndUserId(setId, userId)
    if (!owned) {
      return null
    }

    await this.db.update(schema.sets).set(input).where(eq(schema.sets.id, setId))

    const updated = await this.findSetByIdAndUserId(setId, userId)
    return updated
  }

  async deleteSetForUser(
    setId: number,
    userId: number,
  ): Promise<{ deleted: boolean; deletedWorkoutSetId?: number; deletedWorkoutId?: number }> {
    if (isDatabase(this.db)) {
      return inTransaction(this.db, (tx) => this.deleteSetForUserInTransaction(tx, setId, userId))
    }
    return this.deleteSetForUserInTransaction(this.db, setId, userId)
  }

  private async deleteSetForUserInTransaction(
    tx: Transaction,
    setId: number,
    userId: number,
  ): Promise<{ deleted: boolean; deletedWorkoutSetId?: number; deletedWorkoutId?: number }> {
    const rows = await tx
      .select({
        setId: schema.sets.id,
        workoutSetId: schema.sets.workoutSetId,
        workoutId: schema.workoutSets.workoutId,
      })
      .from(schema.sets)
      .innerJoin(schema.workoutSets, eq(schema.workoutSets.id, schema.sets.workoutSetId))
      .innerJoin(schema.workouts, eq(schema.workouts.id, schema.workoutSets.workoutId))
      .where(and(eq(schema.sets.id, setId), eq(schema.workouts.userId, userId)))
      .limit(1)

    const firstRow = rows[0]
    if (!firstRow) {
      return { deleted: false }
    }
    const { workoutSetId, workoutId } = firstRow

    await tx.delete(schema.sets).where(eq(schema.sets.id, setId))

    const setsLeft = await tx
      .select({ count: count() })
      .from(schema.sets)
      .where(eq(schema.sets.workoutSetId, workoutSetId))

    let deletedWorkoutSetId: number | undefined
    let deletedWorkoutId: number | undefined

    if (setsLeft[0]?.count === 0) {
      await tx.delete(schema.workoutSets).where(eq(schema.workoutSets.id, workoutSetId))
      deletedWorkoutSetId = workoutSetId

      const groupsLeft = await tx
        .select({ count: count() })
        .from(schema.workoutSets)
        .where(eq(schema.workoutSets.workoutId, workoutId))

      if (groupsLeft[0]?.count === 0) {
        await tx.delete(schema.workouts).where(eq(schema.workouts.id, workoutId))
        deletedWorkoutId = workoutId
      }
    }

    return {
      deleted: true,
      deletedWorkoutSetId,
      deletedWorkoutId,
    }
  }

  async getContainingBoundsForSet(setId: number): Promise<{
    groupStartDate: string | null
    groupEndDate: string | null
    workoutStartDate: string
    workoutEndDate: string
  } | null> {
    const rows = await this.db
      .select({
        groupStartDate: schema.workoutSets.startDate,
        groupEndDate: schema.workoutSets.endDate,
        workoutStartDate: schema.workouts.startDate,
        workoutEndDate: schema.workouts.endDate,
      })
      .from(schema.sets)
      .innerJoin(schema.workoutSets, eq(schema.workoutSets.id, schema.sets.workoutSetId))
      .innerJoin(schema.workouts, eq(schema.workouts.id, schema.workoutSets.workoutId))
      .where(eq(schema.sets.id, setId))
      .limit(1)

    const row = rows[0]
    if (!row) {
      return null
    }

    return {
      groupStartDate: row.groupStartDate,
      groupEndDate: row.groupEndDate,
      workoutStartDate: row.workoutStartDate ?? '',
      workoutEndDate: row.workoutEndDate ?? '',
    }
  }
}

function isDatabase(db: DbExecutor): db is Database {
  const maybeDatabase = db as Partial<Database>
  return typeof maybeDatabase.transaction === 'function'
}

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const [header] = result
    return getAffectedRows(header)
  }
  const header = result as Partial<ResultSetHeader>
  return typeof header.affectedRows === 'number' ? header.affectedRows : 0
}
