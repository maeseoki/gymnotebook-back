import type {
  MobileDeviceMetadata,
  MobileSessionTokenRow,
  MobileSessionUser,
  MobileSessionView,
} from './mobile-session.js';

export interface CreateMobileSessionTokenInput {
  sessionId: string;
  userId: number;
  tokenFamilyId: string;
  refreshTokenHash: string;
  previousSessionRowId: number | null;
  device: MobileDeviceMetadata;
  now: string;
  expiresAt: string;
}

export interface RotateMobileSessionTokenInput {
  previousRow: MobileSessionTokenRow;
  refreshTokenHash: string;
  now: string;
  expiresAt: string;
}

export interface CleanupMobileSessionsInput {
  expiredBefore: string;
  revokedBefore: string;
  limit: number;
}

export interface MobileSessionTransactionRepositories {
  mobileSessions: MobileSessionRepository;
}

export interface MobileSessionUnitOfWork {
  transaction<T>(
    work: (repositories: MobileSessionTransactionRepositories) => Promise<T>,
  ): Promise<T>;
}

export interface MobileSessionRepository {
  create(input: CreateMobileSessionTokenInput): Promise<MobileSessionTokenRow>;
  findByRefreshTokenHashForUpdate(hash: string): Promise<MobileSessionTokenRow | null>;
  findUserForSession(userId: number): Promise<MobileSessionUser | null>;
  rotate(input: RotateMobileSessionTokenInput): Promise<MobileSessionTokenRow>;
  revokeTokenFamily(tokenFamilyId: string, now: string): Promise<number>;
  revokeByRefreshTokenHash(hash: string, now: string): Promise<void>;
  revokeBySessionIdForUser(input: {
    userId: number;
    sessionId: string;
    now: string;
  }): Promise<number>;
  revokeAllForUser(input: {
    userId: number;
    now: string;
    exceptSessionId?: string;
  }): Promise<number>;
  listActiveByUser(input: {
    userId: number;
    now: string;
    currentSessionId?: string;
  }): Promise<MobileSessionView[]>;
  cleanup(input: CleanupMobileSessionsInput): Promise<number>;
}
