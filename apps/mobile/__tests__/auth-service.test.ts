import { MobileTokenPairResponseSchema } from '@gymnotebook/contracts';
import { type MobileAuthApi, MobileAuthApiError } from '@/features/auth/api/mobile-auth-api';
import { createAuthService } from '@/features/auth/application/auth-service';
import type { AccessTokenMemory } from '@/shared/auth/access-token-memory';
import type { RefreshTokenStorage } from '@/shared/auth/refresh-token-storage';
import { useAuthSessionStore } from '@/shared/auth/session-store';

const tokenPair = MobileTokenPairResponseSchema.parse({
  accessToken: 'access-token',
  refreshToken: 'refresh-token-value-that-is-long-enough',
  accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
  refreshTokenExpiresAt: '2026-07-10T10:00:00.000Z',
  user: {
    id: 1,
    username: 'victor',
    email: 'victor@example.test',
    roles: ['ROLE_USER'],
  },
});

function createMemoryAccessTokens(): AccessTokenMemory & { value: string | null } {
  return {
    value: null,
    get() {
      return this.value;
    },
    set(token) {
      this.value = token;
    },
    clear() {
      this.value = null;
    },
  };
}

function createRefreshStorage(initial: string | null = null): RefreshTokenStorage & {
  value: string | null;
  failSet: boolean;
} {
  return {
    value: initial,
    failSet: false,
    async get() {
      return { ok: true, value: this.value };
    },
    async set(token) {
      if (this.failSet) {
        return { ok: false, error: 'write_failed' };
      }
      this.value = token;
      return { ok: true, value: undefined };
    },
    async clear() {
      this.value = null;
      return { ok: true, value: undefined };
    },
  };
}

function createApi(overrides: Partial<MobileAuthApi> = {}): MobileAuthApi {
  return {
    signIn: jest.fn().mockResolvedValue(tokenPair),
    signUp: jest.fn().mockResolvedValue(tokenPair),
    refresh: jest.fn().mockResolvedValue(tokenPair),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function backendFailure(code: string, status = 401): MobileAuthApiError {
  return new MobileAuthApiError({
    kind: 'backend',
    status,
    code,
    message: code,
  });
}

function networkFailure(): MobileAuthApiError {
  return new MobileAuthApiError({ kind: 'network_unavailable', message: 'offline' });
}

describe('auth service', () => {
  beforeEach(() => {
    useAuthSessionStore.getState().setRestoring();
  });

  it('stores refresh token before authenticating token pair metadata', async () => {
    const refreshTokens = createRefreshStorage();
    const accessTokens = createMemoryAccessTokens();
    const service = createAuthService({
      api: createApi(),
      refreshTokens,
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.signIn({ username: 'victor', password: 'secret' })).resolves.toEqual({
      status: 'authenticated',
      userId: 1,
    });

    expect(refreshTokens.value).toBe(tokenPair.refreshToken);
    expect(accessTokens.value).toBe(tokenPair.accessToken);
    expect(useAuthSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      user: tokenPair.user,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
    });
  });

  it('does not authenticate when SecureStore write fails', async () => {
    const refreshTokens = createRefreshStorage();
    refreshTokens.failSet = true;
    const accessTokens = createMemoryAccessTokens();
    const service = createAuthService({
      api: createApi(),
      refreshTokens,
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.signIn({ username: 'victor', password: 'secret' })).rejects.toMatchObject({
      reason: 'secure_storage_unavailable',
    });

    expect(accessTokens.value).toBeNull();
    expect(useAuthSessionStore.getState().status).toBe('unauthenticated');
  });

  it('restores missing refresh token as unauthenticated', async () => {
    const accessTokens = createMemoryAccessTokens();
    const service = createAuthService({
      api: createApi(),
      refreshTokens: createRefreshStorage(),
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.restoreSession()).resolves.toEqual({ status: 'unauthenticated' });
    expect(accessTokens.value).toBeNull();
    expect(useAuthSessionStore.getState().status).toBe('unauthenticated');
  });

  it('restores and rotates refresh token on refresh success', async () => {
    const refreshTokens = createRefreshStorage('old-refresh-token-value-that-is-long-enough');
    const accessTokens = createMemoryAccessTokens();
    const api = createApi();
    const service = createAuthService({
      api,
      refreshTokens,
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.restoreSession()).resolves.toMatchObject({ status: 'authenticated' });

    expect(api.refresh).toHaveBeenCalledWith({
      refreshToken: 'old-refresh-token-value-that-is-long-enough',
    });
    expect(refreshTokens.value).toBe(tokenPair.refreshToken);
    expect(accessTokens.value).toBe(tokenPair.accessToken);
  });

  it('clears SecureStore and memory token on invalid restored session', async () => {
    const refreshTokens = createRefreshStorage('old-refresh-token-value-that-is-long-enough');
    const accessTokens = createMemoryAccessTokens();
    accessTokens.set('stale-access');
    const service = createAuthService({
      api: createApi({
        refresh: jest.fn().mockRejectedValue(backendFailure('invalid_mobile_session')),
      }),
      refreshTokens,
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.restoreSession()).resolves.toEqual({ status: 'unauthenticated' });
    expect(refreshTokens.value).toBeNull();
    expect(accessTokens.value).toBeNull();
  });

  it('keeps refresh token on restoration network failure and requires reauthentication', async () => {
    const refreshTokens = createRefreshStorage('old-refresh-token-value-that-is-long-enough');
    const accessTokens = createMemoryAccessTokens();
    const service = createAuthService({
      api: createApi({ refresh: jest.fn().mockRejectedValue(networkFailure()) }),
      refreshTokens,
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.restoreSession()).rejects.toMatchObject({
      reason: 'network_unavailable',
    });
    expect(refreshTokens.value).toBe('old-refresh-token-value-that-is-long-enough');
    expect(accessTokens.value).toBeNull();
    expect(useAuthSessionStore.getState().status).toBe('reauthentication_required');
  });

  it('maps sign in invalid credentials without exposing backend codes to the UI', async () => {
    const service = createAuthService({
      api: createApi({
        signIn: jest.fn().mockRejectedValue(backendFailure('invalid_credentials')),
      }),
      refreshTokens: createRefreshStorage(),
      accessTokens: createMemoryAccessTokens(),
      getStore: useAuthSessionStore.getState,
    });

    await expect(service.signIn({ username: 'victor', password: 'bad' })).rejects.toMatchObject({
      message: 'The username or password is incorrect.',
      reason: 'invalid_credentials',
    });
  });

  it('signs up successfully and stores the returned token pair', async () => {
    const refreshTokens = createRefreshStorage();
    const service = createAuthService({
      api: createApi(),
      refreshTokens,
      accessTokens: createMemoryAccessTokens(),
      getStore: useAuthSessionStore.getState,
    });

    await expect(
      service.signUp({
        username: 'victor',
        email: 'victor@example.test',
        password: 'secret1',
      }),
    ).resolves.toEqual({ status: 'authenticated', userId: 1 });
    expect(refreshTokens.value).toBe(tokenPair.refreshToken);
  });

  it('logs out locally even when server logout fails', async () => {
    const refreshTokens = createRefreshStorage('old-refresh-token-value-that-is-long-enough');
    const accessTokens = createMemoryAccessTokens();
    accessTokens.set('access-token');
    useAuthSessionStore.getState().setAuthenticated({
      user: tokenPair.user,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
    });
    const service = createAuthService({
      api: createApi({ logout: jest.fn().mockRejectedValue(networkFailure()) }),
      refreshTokens,
      accessTokens,
      getStore: useAuthSessionStore.getState,
    });

    await service.logOut();

    expect(refreshTokens.value).toBeNull();
    expect(accessTokens.value).toBeNull();
    expect(useAuthSessionStore.getState().status).toBe('unauthenticated');
  });

  it('never stores a refresh token in Zustand state', async () => {
    const service = createAuthService({
      api: createApi(),
      refreshTokens: createRefreshStorage(),
      accessTokens: createMemoryAccessTokens(),
      getStore: useAuthSessionStore.getState,
    });

    await service.signIn({ username: 'victor', password: 'secret' });

    expect(useAuthSessionStore.getState()).not.toHaveProperty('refreshToken');
  });
});
