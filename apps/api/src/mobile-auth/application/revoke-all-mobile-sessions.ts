import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js';
import type { Clock } from '../domain/mobile-session-time.js';
import { toMysqlUtc } from '../domain/mobile-session-time.js';

export interface RevokeAllMobileSessionsDeps {
  unitOfWork: MobileSessionUnitOfWork;
  clock: Clock;
}

export async function revokeAllMobileSessionsForUser(
  input: { userId: number; exceptSessionId?: string },
  deps: RevokeAllMobileSessionsDeps,
): Promise<number> {
  const now = toMysqlUtc(deps.clock.now());
  return deps.unitOfWork.transaction(({ mobileSessions }) =>
    mobileSessions.revokeAllForUser({ ...input, now }),
  );
}
