export type MobileSecurityEventType =
  | 'mobile_refresh_token_immediate_replay'
  | 'mobile_refresh_token_reuse'

export interface MobileSecurityEvent {
  type: MobileSecurityEventType
  userId: number | null
  sessionId: string | null
  tokenFamilyId: string | null
  occurredAt: string
}

export interface SecurityEventRecorder {
  record(event: MobileSecurityEvent): Promise<void>
}

export class NoopSecurityEventRecorder implements SecurityEventRecorder {
  async record(_event: MobileSecurityEvent): Promise<void> {}
}
