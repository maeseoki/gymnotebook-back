import {
  createSecureStoreRefreshTokenStorage,
  type SecureStoreLike,
} from '@/shared/auth/refresh-token-storage';

function fakeSecureStore(): SecureStoreLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    isAvailableAsync: async () => true,
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      values.set(key, value);
    },
    deleteItemAsync: async (key) => {
      values.delete(key);
    },
  };
}

describe('SecureStore refresh token adapter', () => {
  it('stores, reads and clears a refresh token through the injected secure store', async () => {
    const secureStore = fakeSecureStore();
    const storage = createSecureStoreRefreshTokenStorage(secureStore);

    await expect(storage.set('refresh')).resolves.toEqual({ ok: true, value: undefined });
    await expect(storage.get()).resolves.toEqual({ ok: true, value: 'refresh' });
    await expect(storage.clear()).resolves.toEqual({ ok: true, value: undefined });
    await expect(storage.get()).resolves.toEqual({ ok: true, value: null });
  });

  it('normalizes storage failures', async () => {
    const storage = createSecureStoreRefreshTokenStorage({
      ...fakeSecureStore(),
      getItemAsync: async () => {
        throw new Error('read failed');
      },
    });

    await expect(storage.get()).resolves.toEqual({ ok: false, error: 'read_failed' });
  });

  it('normalizes availability failures on get, set and clear', async () => {
    const unavailableStore: SecureStoreLike = {
      ...fakeSecureStore(),
      isAvailableAsync: async () => {
        throw new Error('availability failed');
      },
    };

    const storage = createSecureStoreRefreshTokenStorage(unavailableStore);

    await expect(storage.get()).resolves.toEqual({ ok: false, error: 'read_failed' });
    await expect(storage.set('refresh')).resolves.toEqual({ ok: false, error: 'write_failed' });
    await expect(storage.clear()).resolves.toEqual({ ok: false, error: 'delete_failed' });
  });

  it('keeps unavailable distinct from read, write and delete failures', async () => {
    const storage = createSecureStoreRefreshTokenStorage({
      ...fakeSecureStore(),
      isAvailableAsync: async () => false,
    });

    await expect(storage.get()).resolves.toEqual({ ok: false, error: 'unavailable' });
    await expect(storage.set('refresh')).resolves.toEqual({ ok: false, error: 'unavailable' });
    await expect(storage.clear()).resolves.toEqual({ ok: false, error: 'unavailable' });
  });
});
