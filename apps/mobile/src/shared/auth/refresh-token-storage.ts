import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'gymnotebook.mobile.v1.refreshToken';

export type RefreshTokenStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: 'unavailable' | 'read_failed' | 'write_failed' | 'delete_failed' };

export interface RefreshTokenStorage {
  get: () => Promise<RefreshTokenStorageResult<string | null>>;
  set: (token: string) => Promise<RefreshTokenStorageResult<void>>;
  clear: () => Promise<RefreshTokenStorageResult<void>>;
}

export interface SecureStoreLike {
  isAvailableAsync: () => Promise<boolean>;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

export function createSecureStoreRefreshTokenStorage(
  secureStore: SecureStoreLike = SecureStore,
): RefreshTokenStorage {
  return {
    async get() {
      try {
        if (!(await secureStore.isAvailableAsync())) {
          return { ok: false, error: 'unavailable' };
        }
        return { ok: true, value: await secureStore.getItemAsync(REFRESH_TOKEN_KEY) };
      } catch {
        return { ok: false, error: 'read_failed' };
      }
    },
    async set(token) {
      try {
        if (!(await secureStore.isAvailableAsync())) {
          return { ok: false, error: 'unavailable' };
        }
        await secureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
        return { ok: true, value: undefined };
      } catch {
        return { ok: false, error: 'write_failed' };
      }
    },
    async clear() {
      try {
        if (!(await secureStore.isAvailableAsync())) {
          return { ok: false, error: 'unavailable' };
        }
        await secureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return { ok: true, value: undefined };
      } catch {
        return { ok: false, error: 'delete_failed' };
      }
    },
  };
}
