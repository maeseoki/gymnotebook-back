import { createMobileApiClient } from '@/shared/api/client';

describe('mobile API client', () => {
  it('does not force a global JSON content type', () => {
    const client = createMobileApiClient({ baseUrl: 'https://example.invalid/api' });

    expect(client.defaults.headers.common.Accept).toContain('application/json');
    expect(client.defaults.headers.common['Content-Type']).toBeUndefined();
  });
});
