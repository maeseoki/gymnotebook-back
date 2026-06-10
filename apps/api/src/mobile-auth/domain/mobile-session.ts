import type { ERole } from '@gymnotebook/contracts';

export type MobileDevicePlatform = 'android' | 'ios';

export interface MobileDeviceMetadata {
  name?: string;
  platform?: MobileDevicePlatform;
}

export interface MobileSessionUser {
  id: number;
  username: string;
  email: string;
  roles: ERole[];
}

export interface MobileSessionTokenRow {
  id: number;
  sessionId: string;
  userId: number;
  tokenFamilyId: string;
  refreshTokenHash: string;
  previousSessionRowId: number | null;
  replacedBySessionRowId: number | null;
  deviceName: string | null;
  devicePlatform: MobileDevicePlatform | null;
  createdAt: string;
  lastUsedAt: string;
  rotatedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
}

export interface MobileSessionView {
  id: string;
  deviceName: string | null;
  devicePlatform: MobileDevicePlatform | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export interface CreatedMobileSession {
  tokenRow: MobileSessionTokenRow;
  user: MobileSessionUser;
  rawRefreshToken: string;
}

export interface RotatedMobileSession {
  tokenRow: MobileSessionTokenRow;
  user: MobileSessionUser;
  rawRefreshToken: string;
  replacedTokenRowId: number;
}
