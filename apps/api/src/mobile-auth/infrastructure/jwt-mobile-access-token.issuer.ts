import type {
  MobileAccessTokenClaims,
  MobileAccessTokenIssuer,
} from '../domain/mobile-access-token-issuer.js';

export type JwtSignFunction = (
  payload: MobileAccessTokenClaims,
  options: { expiresIn: number },
) => string;

export class JwtMobileAccessTokenIssuer implements MobileAccessTokenIssuer {
  constructor(
    private readonly sign: JwtSignFunction,
    private readonly ttlMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  issue(claims: MobileAccessTokenClaims) {
    const expiresIn = Math.floor(this.ttlMs / 1000);
    return {
      token: this.sign(claims, { expiresIn }),
      expiresAt: new Date(this.now().getTime() + this.ttlMs).toISOString(),
    };
  }
}
