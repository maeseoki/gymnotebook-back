import type { MobileTokenPairResponse, MobileUser } from '@gymnotebook/contracts'
import type {
  MobileAccessTokenIssued,
  MobileAccessTokenIssuer,
} from '../domain/mobile-access-token-issuer.js'
import type { MobileSessionTokenRow, MobileSessionUser } from '../domain/mobile-session.js'
import { mysqlUtcToIso } from '../domain/mobile-session-time.js'

export function toMobileTokenPairResponse(input: {
  accessToken: MobileAccessTokenIssued
  tokenRow: MobileSessionTokenRow
  user: MobileSessionUser
  rawRefreshToken: string
}): MobileTokenPairResponse {
  return {
    accessToken: input.accessToken.token,
    refreshToken: input.rawRefreshToken,
    accessTokenExpiresAt: input.accessToken.expiresAt,
    refreshTokenExpiresAt: mysqlUtcToIso(input.tokenRow.expiresAt),
    user: toMobileUser(input.user),
  }
}

export function issueMobileAccessToken(input: {
  issuer: MobileAccessTokenIssuer
  tokenRow: Pick<MobileSessionTokenRow, 'sessionId'>
  user: MobileSessionUser
}): MobileAccessTokenIssued {
  return input.issuer.issue({
    sub: input.user.username,
    userId: input.user.id,
    roles: input.user.roles,
    sessionId: input.tokenRow.sessionId,
  })
}

function toMobileUser(user: MobileSessionUser): MobileUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  }
}
