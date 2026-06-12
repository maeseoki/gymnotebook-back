import { MobileTokenPairResponseSchema } from '@gymnotebook/contracts'
import axios, { AxiosError, type AxiosInstance } from 'axios'
import { createMobileAuthApi, MobileAuthApiError } from '@/features/auth/api/mobile-auth-api'

const tokenPair = MobileTokenPairResponseSchema.parse({
  accessToken: 'access-token',
  refreshToken: 'refresh-token-value-that-is-long-enough',
  accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
  refreshTokenExpiresAt: '2026-07-10T10:00:00.000Z',
  user: {
    id: 1,
    username: 'victor',
    email: 'victor@example.test',
    roles: ['ROLE_USER'],
  },
})

function clientWithPost(post: jest.Mock): AxiosInstance {
  return { post } as unknown as AxiosInstance
}

describe('mobile auth API', () => {
  it('posts sign in payloads and parses token pair responses', async () => {
    const post = jest.fn().mockResolvedValue({ data: tokenPair })
    const api = createMobileAuthApi(clientWithPost(post))

    await expect(api.signIn({ username: 'victor', password: 'secret' })).resolves.toEqual(tokenPair)

    expect(post).toHaveBeenCalledWith('/auth/mobile/signin', {
      username: 'victor',
      password: 'secret',
    })
  })

  it('normalizes backend and response validation errors', async () => {
    const backendError = new AxiosError('unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: {
        statusCode: 401,
        code: 'invalid_credentials',
        message: 'Invalid username or password',
      },
    })
    const api = createMobileAuthApi(clientWithPost(jest.fn().mockRejectedValue(backendError)))

    await expect(api.signIn({ username: 'victor', password: 'bad' })).rejects.toMatchObject({
      failure: { kind: 'backend', status: 401, code: 'invalid_credentials' },
    })

    const invalidApi = createMobileAuthApi(
      clientWithPost(jest.fn().mockResolvedValue({ data: {} })),
    )
    await expect(
      invalidApi.refresh({ refreshToken: 'refresh-token-value-that-is-long-enough' }),
    ).rejects.toBeInstanceOf(MobileAuthApiError)
  })

  it('posts signup, refresh and logout to mobile auth endpoints', async () => {
    const post = jest.fn().mockResolvedValue({ data: tokenPair })
    const api = createMobileAuthApi(clientWithPost(post))

    await api.signUp({
      username: 'victor',
      email: 'victor@example.test',
      password: 'secret1',
      device: { platform: 'android' },
    })
    await api.refresh({ refreshToken: 'refresh-token-value-that-is-long-enough' })
    await api.logout({ refreshToken: 'refresh-token-value-that-is-long-enough' })

    expect(post).toHaveBeenNthCalledWith(1, '/auth/mobile/signup', {
      username: 'victor',
      email: 'victor@example.test',
      password: 'secret1',
      device: { platform: 'android' },
    })
    expect(post).toHaveBeenNthCalledWith(2, '/auth/mobile/refresh', {
      refreshToken: 'refresh-token-value-that-is-long-enough',
    })
    expect(post).toHaveBeenNthCalledWith(3, '/auth/mobile/logout', {
      refreshToken: 'refresh-token-value-that-is-long-enough',
    })
  })
})
