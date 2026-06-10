import type { MobileUser } from '@gymnotebook/contracts';
import { create } from 'zustand';

export type AuthStatus =
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated'
  | 'reauthentication_required';

export interface AuthSessionState {
  status: AuthStatus;
  user: MobileUser | null;
  accessTokenExpiresAt: string | null;
  setRestoring: () => void;
  setAuthenticated: (input: { user: MobileUser; accessTokenExpiresAt: string }) => void;
  setUnauthenticated: () => void;
  setReauthenticationRequired: () => void;
}

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  status: 'restoring',
  user: null,
  accessTokenExpiresAt: null,
  setRestoring: () => set({ status: 'restoring', user: null, accessTokenExpiresAt: null }),
  setAuthenticated: (input) =>
    set({
      status: 'authenticated',
      user: input.user,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
    }),
  setUnauthenticated: () =>
    set({ status: 'unauthenticated', user: null, accessTokenExpiresAt: null }),
  setReauthenticationRequired: () =>
    set({ status: 'reauthentication_required', user: null, accessTokenExpiresAt: null }),
}));

export const authSessionSelectors = {
  status: (state: AuthSessionState) => state.status,
  user: (state: AuthSessionState) => state.user,
  isAuthenticated: (state: AuthSessionState) => state.status === 'authenticated',
};
