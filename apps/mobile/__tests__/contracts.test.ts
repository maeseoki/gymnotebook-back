import { MobileSignInRequestSchema, MobileTokenPairResponseSchema } from '@gymnotebook/contracts';

describe('contracts import', () => {
  it('uses shared mobile auth schemas from the workspace package', () => {
    expect(MobileSignInRequestSchema.parse({ username: 'victor', password: 'secret' })).toEqual({
      username: 'victor',
      password: 'secret',
    });

    expect(
      MobileTokenPairResponseSchema.parse({
        accessToken: 'access',
        refreshToken: 'refresh-token-value',
        accessTokenExpiresAt: '2026-06-10T10:00:00.000Z',
        refreshTokenExpiresAt: '2026-07-10T10:00:00.000Z',
        user: {
          id: 1,
          username: 'victor',
          email: 'victor@example.com',
          roles: ['ROLE_USER'],
        },
      }),
    ).toMatchObject({ accessToken: 'access' });
  });
});
