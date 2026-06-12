import { and, eq } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2'
import * as schema from '../../../drizzle/schema.js'
import type { Database } from '../../shared/db.js'
import type { DbExecutor, Transaction } from '../../shared/transaction.js'
import { inTransaction } from '../../shared/transaction.js'
import type { ImageDraft, ImageUploadResult, StoredImage } from '../domain/image.js'
import type { DeleteOwnedImageResult, ImageRepository } from '../domain/image.repository.js'

export class DrizzleImageRepository implements ImageRepository {
  constructor(private readonly db: DbExecutor) {}

  async createOwned(input: ImageDraft): Promise<ImageUploadResult> {
    const inserted = await this.db
      .insert(schema.imageData)
      .values({
        name: input.originalName,
        type: input.mediaType,
        imageData: input.data,
        userId: input.ownerUserId,
      })
      .$returningId()
    const id = inserted[0]?.id
    if (typeof id !== 'number') {
      throw new Error('Failed to create image')
    }
    return { id }
  }

  async findPublicById(id: number): Promise<StoredImage | null> {
    const rows = await this.db
      .select()
      .from(schema.imageData)
      .where(eq(schema.imageData.id, id))
      .limit(1)
    const row = rows[0]
    return row ? mapRow(row) : null
  }

  async deleteOwnedIfUnused(id: number, ownerUserId: number): Promise<DeleteOwnedImageResult> {
    if (isDatabase(this.db)) {
      return inTransaction(this.db, (tx) =>
        this.deleteOwnedIfUnusedInTransaction(tx, id, ownerUserId),
      )
    }
    return this.deleteOwnedIfUnusedInTransaction(this.db, id, ownerUserId)
  }

  private async deleteOwnedIfUnusedInTransaction(
    tx: Transaction,
    id: number,
    ownerUserId: number,
  ): Promise<DeleteOwnedImageResult> {
    const imageRows = await tx
      .select({ id: schema.imageData.id })
      .from(schema.imageData)
      .where(and(eq(schema.imageData.id, id), eq(schema.imageData.userId, ownerUserId)))
      .limit(1)
      .for('update')
    if (imageRows.length === 0) {
      return 'not_found'
    }

    const exerciseRows = await tx
      .select({ id: schema.exercises.id })
      .from(schema.exercises)
      .where(and(eq(schema.exercises.imageId, id), eq(schema.exercises.userId, ownerUserId)))
      .limit(1)
      .for('update')
    if (exerciseRows.length > 0) {
      return 'in_use'
    }

    const result = await tx
      .delete(schema.imageData)
      .where(and(eq(schema.imageData.id, id), eq(schema.imageData.userId, ownerUserId)))
    return getAffectedRows(result) > 0 ? 'deleted' : 'not_found'
  }
}

function mapRow(row: typeof schema.imageData.$inferSelect): StoredImage {
  return {
    id: row.id,
    ownerUserId: row.userId,
    originalName: row.name,
    mediaType: row.type,
    data: row.imageData,
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
