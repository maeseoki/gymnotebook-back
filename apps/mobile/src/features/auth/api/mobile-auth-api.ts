import {
  type MobileLogoutRequest,
  MobileLogoutRequestSchema,
  type MobileRefreshRequest,
  MobileRefreshRequestSchema,
  type MobileSignInRequest,
  MobileSignInRequestSchema,
  type MobileSignUpRequest,
  MobileSignUpRequestSchema,
  type MobileTokenPairResponse,
  MobileTokenPairResponseSchema,
} from '@gymnotebook/contracts';
import type { AxiosInstance } from 'axios';
import { createMobileApiClient } from '@/shared/api/client';
import { type ApiFailure, normalizeApiError } from '@/shared/api/errors';
import { createAccessTokenMemory } from '@/shared/auth/access-token-memory';

export const mobileAccessTokenMemory = createAccessTokenMemory();

export const mobileApiClient = createMobileApiClient({
  accessToken: mobileAccessTokenMemory.get,
});

export interface MobileAuthApi {
  signIn(input: MobileSignInRequest): Promise<MobileTokenPairResponse>;
  signUp(input: MobileSignUpRequest): Promise<MobileTokenPairResponse>;
  refresh(input: MobileRefreshRequest): Promise<MobileTokenPairResponse>;
  logout(input: MobileLogoutRequest): Promise<void>;
}

export class MobileAuthApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message);
    this.name = 'MobileAuthApiError';
  }
}

export function createMobileAuthApi(client: AxiosInstance = mobileApiClient): MobileAuthApi {
  return {
    async signIn(input) {
      return parseTokenPairResponse(
        await requestTokenPair(() =>
          client.post('/auth/mobile/signin', MobileSignInRequestSchema.parse(input)),
        ),
      );
    },
    async signUp(input) {
      return parseTokenPairResponse(
        await requestTokenPair(() =>
          client.post('/auth/mobile/signup', MobileSignUpRequestSchema.parse(input)),
        ),
      );
    },
    async refresh(input) {
      return parseTokenPairResponse(
        await requestTokenPair(() =>
          client.post('/auth/mobile/refresh', MobileRefreshRequestSchema.parse(input)),
        ),
      );
    },
    async logout(input) {
      try {
        await client.post('/auth/mobile/logout', MobileLogoutRequestSchema.parse(input));
      } catch (error) {
        throw new MobileAuthApiError(normalizeApiError(error));
      }
    },
  };
}

async function requestTokenPair(
  request: () => Promise<{ data: unknown }>,
): Promise<MobileTokenPairResponse> {
  try {
    const response = await request();
    return MobileTokenPairResponseSchema.parse(response.data);
  } catch (error) {
    throw new MobileAuthApiError(normalizeApiError(error));
  }
}

function parseTokenPairResponse(response: MobileTokenPairResponse): MobileTokenPairResponse {
  return response;
}
