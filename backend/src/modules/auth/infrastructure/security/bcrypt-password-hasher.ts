import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import type { PasswordHasher } from '../../domain/ports/password-hasher';

// Cost factor: 2^10 rounds — the project's established bcrypt work factor.
const SALT_ROUNDS = 10;

// ACL over bcryptjs: the only place that imports the hashing library.
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
