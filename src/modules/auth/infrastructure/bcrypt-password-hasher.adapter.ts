import { hash, compare } from 'bcryptjs'
import type { PasswordHasher } from '../domain/ports/password-hasher.port'

const HASH_COST = 12

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, HASH_COST)
  }

  async verify(plaintext: string, hashed: string): Promise<boolean> {
    return compare(plaintext, hashed)
  }
}
