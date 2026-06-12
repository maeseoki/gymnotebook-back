import { persistVersionedJson, restoreVersionedJson } from '@/shared/persistence/json-storage'
import { activeWorkoutStorageKey, createAsyncStorageAdapter } from '@/shared/storage/async-storage'
import {
  type ActiveWorkoutDraft,
  type ActiveWorkoutEnvelope,
  ActiveWorkoutEnvelopeSchema,
} from '../schemas/active-workout-draft'

const storage = createAsyncStorageAdapter()

export type LoadDraftResult =
  | { status: 'success'; draft: ActiveWorkoutDraft | null }
  | { status: 'corrupted'; raw: string; errorType: string }
  | { status: 'error'; message: string }

export const activeWorkoutStorage = {
  async loadDraft(): Promise<LoadDraftResult> {
    try {
      const result = await restoreVersionedJson<ActiveWorkoutEnvelope>(
        storage,
        activeWorkoutStorageKey,
        ActiveWorkoutEnvelopeSchema,
        1, // supportedVersion
      )

      switch (result.status) {
        case 'restored':
          return { status: 'success', draft: result.value.draft }
        case 'missing':
          return { status: 'success', draft: null }
        case 'malformed_json':
        case 'invalid_schema':
        case 'unsupported_version':
        case 'missing_migration':
        case 'migration_failed':
          return {
            status: 'corrupted',
            raw: 'raw' in result ? result.raw : '',
            errorType: result.status,
          }
        default:
          return { status: 'error', message: 'Failed to read from local storage' }
      }
    } catch (error) {
      return {
        status: 'corrupted',
        raw: error instanceof Error ? error.message : String(error),
        errorType: 'unexpected_error',
      }
    }
  },

  async saveDraft(draft: ActiveWorkoutDraft | null): Promise<boolean> {
    try {
      const envelope: ActiveWorkoutEnvelope = {
        schemaVersion: 1,
        draft,
        updatedAt: new Date().toISOString(),
      }
      const result = await persistVersionedJson(storage, activeWorkoutStorageKey, envelope)
      return result.ok
    } catch {
      return false
    }
  },

  async clearDraft(): Promise<boolean> {
    try {
      await storage.removeItem(activeWorkoutStorageKey)
      return true
    } catch {
      return false
    }
  },
}
