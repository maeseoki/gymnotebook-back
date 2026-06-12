export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
  isHash(hash: string): boolean
}

export interface LegacyPasswordHasher {
  verify(hash: string, password: string): Promise<boolean>
  isHash(hash: string): boolean
}
