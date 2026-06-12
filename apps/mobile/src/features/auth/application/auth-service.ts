import type {
  MobileSignInRequest,
  MobileSignUpRequest,
  MobileTokenPairResponse,
} from '@gymnotebook/contracts'
import type { MobileAuthApi } from '@/features/auth/api/mobile-auth-api'
import { createMobileAuthApi, mobileAccessTokenMemory } from '@/features/auth/api/mobile-auth-api'
import { secureStorageError, toAuthServiceError } from '@/features/auth/application/auth-errors'
import type { AccessTokenMemory } from '@/shared/auth/access-token-memory'
import {
  createSecureStoreRefreshTokenStorage,
  type RefreshTokenStorage,
} from '@/shared/auth/refresh-token-storage'
import { type AuthSessionState, useAuthSessionStore } from '@/shared/auth/session-store'

export type AuthResult =
  | { status: 'authenticated'; userId: number }
  | { status: 'unauthenticated' }
  | { status: 'reauthentication_required' }

export interface AuthService {
  restoreSession(): Promise<AuthResult>
  signIn(input: MobileSignInRequest): Promise<AuthResult>
  signUp(input: MobileSignUpRequest): Promise<AuthResult>
  refreshSession(): Promise<AuthResult>
  logOut(): Promise<void>
}

export interface AuthServiceDependencies {
  api: MobileAuthApi
  refreshTokens: RefreshTokenStorage
  accessTokens: AccessTokenMemory
  getStore: () => AuthSessionState
}

export function createAuthService(deps: AuthServiceDependencies): AuthService {
  let operationVersion = 0
  const nextOperation = () => {
    operationVersion += 1
    return operationVersion
  }
  const isCurrent = (operation: number) => operation === operationVersion

  async function applyTokenPair(
    pair: MobileTokenPairResponse,
    operation: number,
  ): Promise<AuthResult> {
    const stored = await deps.refreshTokens.set(pair.refreshToken)
    if (!stored.ok) {
      deps.accessTokens.clear()
      if (isCurrent(operation)) {
        deps.getStore().setUnauthenticated()
      }
      throw secureStorageError('write', stored)
    }

    if (!isCurrent(operation)) {
      return { status: 'unauthenticated' }
    }

    deps.accessTokens.set(pair.accessToken)
    deps.getStore().setAuthenticated({
      user: pair.user,
      accessTokenExpiresAt: pair.accessTokenExpiresAt,
    })
    return { status: 'authenticated', userId: pair.user.id }
  }

  async function clearLocalAuth(
    operation: number,
    status: 'unauthenticated' | 'reauthentication_required',
  ): Promise<AuthResult> {
    await deps.refreshTokens.clear()
    deps.accessTokens.clear()
    if (isCurrent(operation)) {
      if (status === 'reauthentication_required') {
        deps.getStore().setReauthenticationRequired()
      } else {
        deps.getStore().setUnauthenticated()
      }
    }
    return { status }
  }

  return {
    async restoreSession() {
      const operation = nextOperation()
      deps.getStore().setRestoring()
      const stored = await deps.refreshTokens.get()
      if (!stored.ok) {
        deps.accessTokens.clear()
        if (isCurrent(operation)) {
          deps.getStore().setReauthenticationRequired()
        }
        throw secureStorageError('read', stored)
      }

      if (!stored.value) {
        deps.accessTokens.clear()
        if (isCurrent(operation)) {
          deps.getStore().setUnauthenticated()
        }
        return { status: 'unauthenticated' }
      }

      try {
        return await applyTokenPair(
          await deps.api.refresh({ refreshToken: stored.value }),
          operation,
        )
      } catch (error) {
        const authError = toAuthServiceError(error)
        if (authError.reason === 'invalid_mobile_session') {
          return clearLocalAuth(operation, 'unauthenticated')
        }

        deps.accessTokens.clear()
        if (isCurrent(operation)) {
          deps.getStore().setReauthenticationRequired()
        }
        throw authError
      }
    },

    async signIn(input) {
      const operation = nextOperation()
      try {
        return await applyTokenPair(await deps.api.signIn(input), operation)
      } catch (error) {
        if (isCurrent(operation)) {
          deps.accessTokens.clear()
          deps.getStore().setUnauthenticated()
        }
        throw toAuthServiceError(error)
      }
    },

    async signUp(input) {
      const operation = nextOperation()
      try {
        return await applyTokenPair(await deps.api.signUp(input), operation)
      } catch (error) {
        if (isCurrent(operation)) {
          deps.accessTokens.clear()
          deps.getStore().setUnauthenticated()
        }
        throw toAuthServiceError(error)
      }
    },

    async refreshSession() {
      const operation = nextOperation()
      const stored = await deps.refreshTokens.get()
      if (!stored.ok) {
        deps.accessTokens.clear()
        if (isCurrent(operation)) {
          deps.getStore().setReauthenticationRequired()
        }
        throw secureStorageError('read', stored)
      }

      if (!stored.value) {
        deps.accessTokens.clear()
        if (isCurrent(operation)) {
          deps.getStore().setUnauthenticated()
        }
        return { status: 'unauthenticated' }
      }

      try {
        return await applyTokenPair(
          await deps.api.refresh({ refreshToken: stored.value }),
          operation,
        )
      } catch (error) {
        const authError = toAuthServiceError(error)
        if (authError.reason === 'invalid_mobile_session') {
          return clearLocalAuth(operation, 'unauthenticated')
        }
        deps.accessTokens.clear()
        if (isCurrent(operation)) {
          deps.getStore().setReauthenticationRequired()
        }
        throw authError
      }
    },

    async logOut() {
      const operation = nextOperation()
      const stored = await deps.refreshTokens.get()
      if (stored.ok && stored.value) {
        try {
          await deps.api.logout({ refreshToken: stored.value })
        } catch {
          // Logout is local-state authoritative; server revocation is best effort.
        }
      }

      await clearLocalAuth(operation, 'unauthenticated')
    },
  }
}

export const authService = createAuthService({
  api: createMobileAuthApi(),
  refreshTokens: createSecureStoreRefreshTokenStorage(),
  accessTokens: mobileAccessTokenMemory,
  getStore: useAuthSessionStore.getState,
})
