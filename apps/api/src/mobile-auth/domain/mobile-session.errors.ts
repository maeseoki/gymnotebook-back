export type MobileSessionErrorCode =
  | 'invalid_mobile_session'
  | 'immediate_replay'
  | 'mobile_session_expired'
  | 'mobile_session_revoked'
  | 'mobile_refresh_token_reuse'
  | 'mobile_session_not_found'
  | 'mobile_session_not_owned';

export class MobileSessionError extends Error {
  constructor(
    readonly code: MobileSessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MobileSessionError';
  }
}

export class InvalidMobileSessionError extends MobileSessionError {
  constructor() {
    super('invalid_mobile_session', 'Invalid mobile session');
    this.name = 'InvalidMobileSessionError';
  }
}

export class MobileSessionExpiredError extends MobileSessionError {
  constructor() {
    super('mobile_session_expired', 'Mobile session expired');
    this.name = 'MobileSessionExpiredError';
  }
}

export class ImmediateMobileRefreshTokenReplayError extends MobileSessionError {
  constructor() {
    super('immediate_replay', 'Invalid mobile session');
    this.name = 'ImmediateMobileRefreshTokenReplayError';
  }
}

export class MobileSessionRevokedError extends MobileSessionError {
  constructor() {
    super('mobile_session_revoked', 'Mobile session revoked');
    this.name = 'MobileSessionRevokedError';
  }
}

export class MobileRefreshTokenReuseError extends MobileSessionError {
  constructor() {
    super('mobile_refresh_token_reuse', 'Mobile refresh token reuse detected');
    this.name = 'MobileRefreshTokenReuseError';
  }
}

export class MobileSessionNotFoundError extends MobileSessionError {
  constructor() {
    super('mobile_session_not_found', 'Mobile session not found');
    this.name = 'MobileSessionNotFoundError';
  }
}

export class MobileSessionNotOwnedError extends MobileSessionError {
  constructor() {
    super('mobile_session_not_owned', 'Mobile session not found');
    this.name = 'MobileSessionNotOwnedError';
  }
}

export function toExternalMobileSessionError(error: unknown): InvalidMobileSessionError {
  if (error instanceof MobileSessionError) {
    return new InvalidMobileSessionError();
  }
  throw error;
}
