import { randomUUID } from 'node:crypto';
import type { MobileTokenPairResponse } from '@gymnotebook/contracts';
import type { MobileAccessTokenIssuer } from '../domain/mobile-access-token-issuer.js';
import type { MobileDeviceMetadata, MobileSessionUser } from '../domain/mobile-session.js';
import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js';
import type { Clock } from '../domain/mobile-session-time.js';
import { addMilliseconds, toMysqlUtc } from '../domain/mobile-session-time.js';
import type { RefreshTokenService } from '../domain/refresh-token-service.js';
import { issueMobileAccessToken, toMobileTokenPairResponse } from './mobile-auth-result.js';

export interface CreateMobileSessionDeps {
  unitOfWork: MobileSessionUnitOfWork;
  refreshTokens: RefreshTokenService;
  accessTokens: MobileAccessTokenIssuer;
  clock: Clock;
  refreshTokenTtlMs: number;
  isRefreshTokenHashConflict: (error: unknown) => boolean;
}

export async function createMobileSession(
  input: { user: MobileSessionUser; device?: MobileDeviceMetadata },
  deps: CreateMobileSessionDeps,
): Promise<MobileTokenPairResponse> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const rawRefreshToken = deps.refreshTokens.generate();
    const refreshTokenHash = deps.refreshTokens.hash(rawRefreshToken);
    const nowDate = deps.clock.now();
    const now = toMysqlUtc(nowDate);
    const expiresAt = toMysqlUtc(addMilliseconds(nowDate, deps.refreshTokenTtlMs));

    try {
      return await deps.unitOfWork.transaction(async ({ mobileSessions }) => {
        const tokenRow = await mobileSessions.create({
          sessionId: randomUUID(),
          userId: input.user.id,
          tokenFamilyId: randomUUID(),
          refreshTokenHash,
          previousSessionRowId: null,
          device: input.device ?? {},
          now,
          expiresAt,
        });
        const accessToken = issueMobileAccessToken({
          issuer: deps.accessTokens,
          tokenRow,
          user: input.user,
        });

        return toMobileTokenPairResponse({
          accessToken,
          tokenRow,
          user: input.user,
          rawRefreshToken,
        });
      });
    } catch (error) {
      if (attempt < 3 && deps.isRefreshTokenHashConflict(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to create unique mobile refresh token');
}
