import { randomUUID } from 'node:crypto'
import type { MobileSignUpRequest, MobileTokenPairResponse } from '@gymnotebook/contracts'
import {
  DefaultRoleNotFoundError,
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
} from '../../auth/domain/auth.errors.js'
import type { PasswordHasher } from '../../auth/domain/password-hasher.js'
import type { RoleRepository } from '../../users/domain/role.repository.js'
import type { UserRepository } from '../../users/domain/user.repository.js'
import type { MobileAccessTokenIssuer } from '../domain/mobile-access-token-issuer.js'
import type { MobileDeviceMetadata, MobileSessionUser } from '../domain/mobile-session.js'
import type { MobileSessionRepository } from '../domain/mobile-session.repository.js'
import type { Clock } from '../domain/mobile-session-time.js'
import { addMilliseconds, toMysqlUtc } from '../domain/mobile-session-time.js'
import type { RefreshTokenService } from '../domain/refresh-token-service.js'
import { issueMobileAccessToken, toMobileTokenPairResponse } from './mobile-auth-result.js'

export interface MobileSignUpTransactionRepositories {
  users: UserRepository
  roles: RoleRepository
  mobileSessions: MobileSessionRepository
}

export interface SignUpMobileDeps {
  passwordHasher: PasswordHasher
  transaction: <T>(
    work: (repositories: MobileSignUpTransactionRepositories) => Promise<T>,
  ) => Promise<T>
  refreshTokens: RefreshTokenService
  accessTokens: MobileAccessTokenIssuer
  clock: Clock
  refreshTokenTtlMs: number
  isDuplicateUsernameError: (error: unknown) => boolean
  isDuplicateEmailError: (error: unknown) => boolean
  isRefreshTokenHashConflict: (error: unknown) => boolean
}

export async function signUpMobile(
  request: MobileSignUpRequest,
  deps: SignUpMobileDeps,
): Promise<MobileTokenPairResponse> {
  const passwordHash = await deps.passwordHasher.hash(request.password)

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const rawRefreshToken = deps.refreshTokens.generate()
    const refreshTokenHash = deps.refreshTokens.hash(rawRefreshToken)
    const nowDate = deps.clock.now()
    const now = toMysqlUtc(nowDate)
    const expiresAt = toMysqlUtc(addMilliseconds(nowDate, deps.refreshTokenTtlMs))

    try {
      return await deps.transaction(async ({ users, roles, mobileSessions }) => {
        if (await users.existsByUsername(request.username)) {
          throw new UsernameAlreadyExistsError()
        }

        if (await users.existsByEmail(request.email)) {
          throw new EmailAlreadyExistsError()
        }

        const userRole = await roles.findByName('ROLE_USER')
        if (!userRole) {
          throw new DefaultRoleNotFoundError()
        }

        const userId = await users.createUser({
          username: request.username,
          email: request.email,
          passwordHash,
        })
        await users.assignRole(userId, userRole.id)

        const user: MobileSessionUser = {
          id: userId,
          username: request.username,
          email: request.email,
          roles: ['ROLE_USER'],
        }

        const tokenRow = await mobileSessions.create({
          sessionId: randomUUID(),
          userId,
          tokenFamilyId: randomUUID(),
          refreshTokenHash,
          previousSessionRowId: null,
          device: toDeviceMetadata(request.device),
          now,
          expiresAt,
        })
        const accessToken = issueMobileAccessToken({
          issuer: deps.accessTokens,
          tokenRow,
          user,
        })

        return toMobileTokenPairResponse({
          accessToken,
          tokenRow,
          user,
          rawRefreshToken,
        })
      })
    } catch (error) {
      if (deps.isDuplicateUsernameError(error)) {
        throw new UsernameAlreadyExistsError()
      }
      if (deps.isDuplicateEmailError(error)) {
        throw new EmailAlreadyExistsError()
      }
      if (attempt < 3 && deps.isRefreshTokenHashConflict(error)) {
        continue
      }
      throw error
    }
  }

  throw new Error('Failed to create unique mobile refresh token')
}

function toDeviceMetadata(device: MobileSignUpRequest['device']): MobileDeviceMetadata {
  return device ?? {}
}
