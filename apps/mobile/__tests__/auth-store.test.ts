import { useAuthSessionStore } from '@/shared/auth/session-store';

describe('auth session store', () => {
  beforeEach(() => {
    useAuthSessionStore.getState().setRestoring();
  });

  it('transitions through authenticated and cleared states without storing refresh tokens', () => {
    useAuthSessionStore.getState().setAuthenticated({
      accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
      user: { id: 1, username: 'victor', email: 'victor@example.com', roles: ['ROLE_USER'] },
    });

    expect(useAuthSessionStore.getState().status).toBe('authenticated');
    expect(useAuthSessionStore.getState()).not.toHaveProperty('refreshToken');

    useAuthSessionStore.getState().setReauthenticationRequired();
    expect(useAuthSessionStore.getState().status).toBe('reauthentication_required');

    useAuthSessionStore.getState().setUnauthenticated();
    expect(useAuthSessionStore.getState().user).toBeNull();
  });

  it('clears stale user metadata when returning to restoring', () => {
    useAuthSessionStore.getState().setAuthenticated({
      accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
      user: { id: 1, username: 'victor', email: 'victor@example.com', roles: ['ROLE_USER'] },
    });

    useAuthSessionStore.getState().setRestoring();

    expect(useAuthSessionStore.getState()).toMatchObject({
      status: 'restoring',
      user: null,
      accessTokenExpiresAt: null,
    });
  });
});
