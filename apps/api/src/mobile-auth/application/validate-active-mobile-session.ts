import { InvalidMobileSessionError } from '../domain/mobile-session.errors.js'
import type { MobileSessionUnitOfWork } from '../domain/mobile-session.repository.js'
import type { Clock } from '../domain/mobile-session-time.js'
import { toMysqlUtc } from '../domain/mobile-session-time.js'

export interface ValidateActiveMobileSessionDeps {
  unitOfWork: MobileSessionUnitOfWork
  clock: Clock
}

export async function validateActiveMobileSessionForUser(
  input: { userId: number; sessionId: string },
  deps: ValidateActiveMobileSessionDeps,
): Promise<void> {
  const now = toMysqlUtc(deps.clock.now())
  const isActive = await deps.unitOfWork.transaction(({ mobileSessions }) =>
    mobileSessions.isActiveSessionForUser({ ...input, now }),
  )

  if (!isActive) {
    throw new InvalidMobileSessionError()
  }
}
