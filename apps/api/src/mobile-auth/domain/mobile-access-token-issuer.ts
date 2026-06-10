import type { ERole } from '@gymnotebook/contracts';

export interface MobileAccessTokenClaims {
  sub: string;
  userId: number;
  roles: ERole[];
  sessionId: string;
}

export interface MobileAccessTokenIssued {
  token: string;
  expiresAt: string;
}

export interface MobileAccessTokenIssuer {
  issue(claims: MobileAccessTokenClaims): MobileAccessTokenIssued;
}
