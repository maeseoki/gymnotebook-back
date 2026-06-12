import bcrypt from 'bcryptjs'
import type { LegacyPasswordHasher } from '../domain/password-hasher.js'

const bcryptPrefixes = ['$2a$', '$2b$', '$2y$']

export class BcryptPasswordHasher implements LegacyPasswordHasher {
  async verify(hash: string, password: string): Promise<boolean> {
    if (!this.isHash(hash)) {
      return false
    }
    return bcrypt.compare(password, hash)
  }

  isHash(hash: string): boolean {
    return bcryptPrefixes.some((prefix) => hash.startsWith(prefix))
  }
}
