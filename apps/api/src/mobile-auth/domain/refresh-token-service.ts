export interface RefreshTokenService {
  generate(): string
  hash(rawRefreshToken: string): string
  equals(leftHash: string, rightHash: string): boolean
}
