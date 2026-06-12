import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { RefreshTokenService } from '../domain/refresh-token-service.js'

export class CryptoRefreshTokenService implements RefreshTokenService {
  constructor(
    private readonly pepper: string,
    private readonly bytes: number,
  ) {
    if (bytes < 32) {
      throw new Error('Refresh token byte length must be at least 32')
    }
  }

  generate(): string {
    return randomBytes(this.bytes).toString('base64url')
  }

  hash(rawRefreshToken: string): string {
    return createHmac('sha256', this.pepper).update(rawRefreshToken, 'utf8').digest('base64url')
  }

  equals(leftHash: string, rightHash: string): boolean {
    const left = Buffer.from(leftHash, 'utf8')
    const right = Buffer.from(rightHash, 'utf8')
    return left.length === right.length && timingSafeEqual(left, right)
  }
}
