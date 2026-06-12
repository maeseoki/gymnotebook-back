import { z } from 'zod'

export interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

export type RestoreResult<T> =
  | { status: 'restored'; value: T }
  | { status: 'missing' }
  | { status: 'malformed_json'; raw: string }
  | { status: 'invalid_schema'; raw: string }
  | { status: 'unsupported_version'; version: number; raw: string }
  | { status: 'missing_migration'; version: number; raw: string }
  | { status: 'migration_failed'; version: number; raw: string }
  | { status: 'storage_error' }

export type VersionMigration = (value: unknown) => unknown

export type VersionMigrations = Partial<Record<number, VersionMigration>>

export const PersistedEmptyWorkoutEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  draft: z.null(),
  updatedAt: z.string().datetime(),
})

export type PersistedEmptyWorkoutEnvelope = z.infer<typeof PersistedEmptyWorkoutEnvelopeSchema>

export async function restoreVersionedJson<T>(
  storage: KeyValueStorage,
  key: string,
  schema: z.ZodType<T>,
  supportedVersion: number,
  migrations: VersionMigrations = {},
): Promise<RestoreResult<T>> {
  let raw: string | null
  try {
    raw = await storage.getItem(key)
  } catch {
    return { status: 'storage_error' }
  }

  if (raw === null) {
    return { status: 'missing' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'malformed_json', raw }
  }

  const version = z.object({ schemaVersion: z.number().int() }).safeParse(parsed)
  if (!version.success) {
    return { status: 'invalid_schema', raw }
  }

  if (version.data.schemaVersion > supportedVersion) {
    return { status: 'unsupported_version', version: version.data.schemaVersion, raw }
  }

  let migrated = parsed
  let currentVersion = version.data.schemaVersion
  while (currentVersion < supportedVersion) {
    const migrate = migrations[currentVersion]
    if (!migrate) {
      return { status: 'missing_migration', version: currentVersion, raw }
    }

    try {
      migrated = migrate(migrated)
    } catch {
      return { status: 'migration_failed', version: currentVersion, raw }
    }
    currentVersion += 1
  }

  const result = schema.safeParse(migrated)
  if (!result.success) {
    return { status: 'invalid_schema', raw }
  }

  return { status: 'restored', value: result.data }
}

export async function persistVersionedJson<T>(
  storage: KeyValueStorage,
  key: string,
  value: T,
): Promise<{ ok: true } | { ok: false; error: 'storage_error' }> {
  try {
    await storage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch {
    return { ok: false, error: 'storage_error' }
  }
}
