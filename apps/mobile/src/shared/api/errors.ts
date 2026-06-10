import { ErrorResponseSchema } from '@gymnotebook/contracts';
import axios, { AxiosError } from 'axios';
import { z } from 'zod';

export type ApiFailure =
  | { kind: 'backend'; status: number; code: string; message: string }
  | { kind: 'validation'; message: string }
  | { kind: 'network_unavailable'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'unknown'; message: string };

export function normalizeApiError(error: unknown): ApiFailure {
  if (axios.isAxiosError(error)) {
    return normalizeAxiosError(error);
  }

  if (error instanceof z.ZodError) {
    return { kind: 'validation', message: 'Response did not match the expected contract.' };
  }

  return { kind: 'unknown', message: 'An unexpected error occurred.' };
}

function normalizeAxiosError(error: AxiosError): ApiFailure {
  if (error.code === AxiosError.ETIMEDOUT || error.code === 'ECONNABORTED') {
    return { kind: 'timeout', message: 'The request timed out.' };
  }

  if (!error.response) {
    return { kind: 'network_unavailable', message: 'The network is unavailable.' };
  }

  const parsed = ErrorResponseSchema.safeParse(error.response.data);
  if (!parsed.success) {
    return { kind: 'validation', message: 'Backend error response did not match the contract.' };
  }

  return {
    kind: 'backend',
    status: error.response.status,
    code: parsed.data.code,
    message: parsed.data.message,
  };
}
