import * as argon2 from 'argon2';
import type { PasswordHasher } from '../domain/password-hasher.js';

export const argon2idOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, argon2idOptions);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    if (!this.isHash(hash)) {
      return false;
    }
    return argon2.verify(hash, password);
  }

  isHash(hash: string): boolean {
    return hash.startsWith('$argon2id$');
  }
}
