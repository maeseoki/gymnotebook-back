import { shouldRetryQueryFailure } from '@/shared/query/client'

describe('mobile query retry policy', () => {
  it('retries transient network, timeout and selected backend failures', () => {
    expect(shouldRetryQueryFailure(0, { kind: 'network_unavailable', message: 'offline' })).toBe(
      true,
    )
    expect(shouldRetryQueryFailure(1, { kind: 'timeout', message: 'timeout' })).toBe(true)
    expect(
      shouldRetryQueryFailure(0, {
        kind: 'backend',
        status: 503,
        code: 'service_unavailable',
        message: 'try later',
      }),
    ).toBe(true)
  })

  it('does not retry client, validation or unknown failures', () => {
    for (const status of [400, 401, 403, 404]) {
      expect(
        shouldRetryQueryFailure(0, {
          kind: 'backend',
          status,
          code: 'request_failed',
          message: 'request failed',
        }),
      ).toBe(false)
    }

    expect(shouldRetryQueryFailure(0, { kind: 'validation', message: 'bad shape' })).toBe(false)
    expect(shouldRetryQueryFailure(0, new Error('programming failure'))).toBe(false)
  })

  it('caps retries conservatively', () => {
    expect(shouldRetryQueryFailure(2, { kind: 'timeout', message: 'timeout' })).toBe(false)
  })
})
