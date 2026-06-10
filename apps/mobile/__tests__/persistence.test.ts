import {
  type KeyValueStorage,
  PersistedEmptyWorkoutEnvelopeSchema,
  persistVersionedJson,
  restoreVersionedJson,
} from '@/shared/persistence/json-storage';

function memoryStorage(initial?: string): KeyValueStorage & { value: string | null } {
  return {
    value: initial ?? null,
    async getItem() {
      return this.value;
    },
    async setItem(_key, value) {
      this.value = value;
    },
    async removeItem() {
      this.value = null;
    },
  };
}

describe('versioned JSON persistence helper', () => {
  const valid = {
    schemaVersion: 1,
    draft: null,
    updatedAt: '2026-06-10T10:00:00.000Z',
  };

  it('restores valid data and persists writes', async () => {
    const storage = memoryStorage(JSON.stringify(valid));
    await expect(
      restoreVersionedJson(storage, 'key', PersistedEmptyWorkoutEnvelopeSchema, 1),
    ).resolves.toEqual({ status: 'restored', value: valid });

    await expect(persistVersionedJson(storage, 'key', valid)).resolves.toEqual({ ok: true });
  });

  it('handles missing, malformed and unsupported data without crashing', async () => {
    await expect(
      restoreVersionedJson(memoryStorage(), 'key', PersistedEmptyWorkoutEnvelopeSchema, 1),
    ).resolves.toEqual({ status: 'missing' });
    await expect(
      restoreVersionedJson(memoryStorage('{bad'), 'key', PersistedEmptyWorkoutEnvelopeSchema, 1),
    ).resolves.toMatchObject({ status: 'malformed_json' });
    await expect(
      restoreVersionedJson(
        memoryStorage(JSON.stringify({ schemaVersion: 99 })),
        'key',
        PersistedEmptyWorkoutEnvelopeSchema,
        1,
      ),
    ).resolves.toMatchObject({ status: 'unsupported_version', version: 99 });
  });

  it('normalizes storage read and write failures', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('read');
      },
      setItem: async () => {
        throw new Error('write');
      },
      removeItem: async () => undefined,
    };

    await expect(
      restoreVersionedJson(storage, 'key', PersistedEmptyWorkoutEnvelopeSchema, 1),
    ).resolves.toEqual({ status: 'storage_error' });
    await expect(persistVersionedJson(storage, 'key', {})).resolves.toEqual({
      ok: false,
      error: 'storage_error',
    });
  });

  it('migrates older supported versions sequentially before validation', async () => {
    const storage = memoryStorage(
      JSON.stringify({ schemaVersion: 0, updatedAt: '2026-06-10T10:00:00.000Z' }),
    );

    await expect(
      restoreVersionedJson(storage, 'key', PersistedEmptyWorkoutEnvelopeSchema, 1, {
        0: () => valid,
      }),
    ).resolves.toEqual({ status: 'restored', value: valid });
  });

  it('reports missing migration steps', async () => {
    await expect(
      restoreVersionedJson(
        memoryStorage(JSON.stringify({ schemaVersion: 0 })),
        'key',
        PersistedEmptyWorkoutEnvelopeSchema,
        1,
      ),
    ).resolves.toMatchObject({ status: 'missing_migration', version: 0 });
  });

  it('reports migration failures', async () => {
    await expect(
      restoreVersionedJson(
        memoryStorage(JSON.stringify({ schemaVersion: 0 })),
        'key',
        PersistedEmptyWorkoutEnvelopeSchema,
        1,
        {
          0: () => {
            throw new Error('migration failed');
          },
        },
      ),
    ).resolves.toMatchObject({ status: 'migration_failed', version: 0 });
  });

  it('reports migrated values that fail the final schema', async () => {
    await expect(
      restoreVersionedJson(
        memoryStorage(JSON.stringify({ schemaVersion: 0 })),
        'key',
        PersistedEmptyWorkoutEnvelopeSchema,
        1,
        { 0: () => ({ schemaVersion: 1, draft: 'invalid' }) },
      ),
    ).resolves.toMatchObject({ status: 'invalid_schema' });
  });

  it('rejects future versions without attempting migration', async () => {
    await expect(
      restoreVersionedJson(
        memoryStorage(JSON.stringify({ schemaVersion: 2 })),
        'key',
        PersistedEmptyWorkoutEnvelopeSchema,
        1,
        { 1: () => valid },
      ),
    ).resolves.toMatchObject({ status: 'unsupported_version', version: 2 });
  });
});
