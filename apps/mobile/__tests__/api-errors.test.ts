import axios, { AxiosError } from 'axios';
import { z } from 'zod';
import { normalizeApiError } from '@/shared/api/errors';

describe('api error normalization', () => {
  it('normalizes backend application errors', () => {
    const error = new AxiosError('bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { statusCode: 400, code: 'validation_failed', message: 'Invalid body' },
    });

    expect(normalizeApiError(error)).toEqual({
      kind: 'backend',
      status: 400,
      code: 'validation_failed',
      message: 'Invalid body',
    });
  });

  it('normalizes timeouts, network failures and schema mismatches', () => {
    expect(normalizeApiError(new AxiosError('timeout', 'ECONNABORTED'))).toMatchObject({
      kind: 'timeout',
    });
    expect(normalizeApiError(new AxiosError('network'))).toMatchObject({
      kind: 'network_unavailable',
    });
    expect(normalizeApiError(new z.ZodError([]))).toMatchObject({ kind: 'validation' });
  });
});
