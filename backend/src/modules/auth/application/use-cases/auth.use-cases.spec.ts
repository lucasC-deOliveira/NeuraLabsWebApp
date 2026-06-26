import { describe, it, expect } from 'vitest';
import { RegisterUserUseCase } from './register-user.use-case';
import { LoginUserUseCase } from './login-user.use-case';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../../domain/errors';
import type { NewUser, UserRepository } from '../../domain/ports/user-repository';
import type { PasswordHasher } from '../../domain/ports/password-hasher';
import type { TokenIssuer } from '../../domain/ports/token-issuer';
import {
  toAuthenticatedUser,
  type AuthenticatedUser,
  type UserCredentials,
} from '../../domain/user';

class FakeUserRepository implements UserRepository {
  created: NewUser[] = [];
  touched: string[] = [];
  constructor(private readonly stored: UserCredentials | null = null) {}
  async findByEmail(email: string): Promise<UserCredentials | null> {
    return this.stored && this.stored.email === email ? this.stored : null;
  }
  async findById(id: string): Promise<AuthenticatedUser | null> {
    if (!this.stored || this.stored.id !== id) return null;
    return toAuthenticatedUser(this.stored);
  }
  async create(user: NewUser): Promise<AuthenticatedUser> {
    this.created.push(user);
    return { id: 'new-id', nome: user.nome, email: user.email };
  }
  async touchLastAccess(id: string): Promise<void> {
    this.touched.push(id);
  }
}

// Hashes by prefixing, so compare() is a deterministic, dependency-free check.
class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

class FakeTokenIssuer implements TokenIssuer {
  async issue(userId: string): Promise<string> {
    return `token:${userId}`;
  }
}

const stored = (overrides: Partial<UserCredentials> = {}): UserCredentials => ({
  id: 'u1',
  nome: 'Ada',
  email: 'ada@example.com',
  senhaHash: 'hashed:secret',
  ...overrides,
});

describe('auth use-cases', () => {
  it('registers a new user, normalizing email and trimming the name', async () => {
    const repo = new FakeUserRepository(null);
    const result = await new RegisterUserUseCase(
      repo,
      new FakePasswordHasher(),
      new FakeTokenIssuer(),
    ).execute({ nome: '  Ada ', email: '  Ada@Example.COM ', senha: 'secret' });

    expect(result).toEqual({
      token: 'token:new-id',
      user: { id: 'new-id', nome: 'Ada', email: 'ada@example.com' },
    });
    expect(repo.created).toEqual([
      { nome: 'Ada', email: 'ada@example.com', senhaHash: 'hashed:secret' },
    ]);
  });

  it('rejects registration when the email already exists', async () => {
    const repo = new FakeUserRepository(stored());
    await expect(
      new RegisterUserUseCase(repo, new FakePasswordHasher(), new FakeTokenIssuer()).execute({
        nome: 'Ada',
        email: 'ada@example.com',
        senha: 'secret',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(repo.created).toEqual([]);
  });

  it('logs in with valid credentials and records the access time', async () => {
    const repo = new FakeUserRepository(stored());
    const result = await new LoginUserUseCase(
      repo,
      new FakePasswordHasher(),
      new FakeTokenIssuer(),
    ).execute({ email: 'ADA@example.com', senha: 'secret' });

    expect(result).toEqual({
      token: 'token:u1',
      user: { id: 'u1', nome: 'Ada', email: 'ada@example.com' },
    });
    expect(repo.touched).toEqual(['u1']);
  });

  it('rejects login for an unknown email without touching access time', async () => {
    const repo = new FakeUserRepository(null);
    await expect(
      new LoginUserUseCase(repo, new FakePasswordHasher(), new FakeTokenIssuer()).execute({
        email: 'nobody@example.com',
        senha: 'secret',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(repo.touched).toEqual([]);
  });

  it('rejects login when the password does not match', async () => {
    const repo = new FakeUserRepository(stored());
    await expect(
      new LoginUserUseCase(repo, new FakePasswordHasher(), new FakeTokenIssuer()).execute({
        email: 'ada@example.com',
        senha: 'wrong',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('returns the current user without the password hash', async () => {
    const repo = new FakeUserRepository(stored());
    const user = await new GetCurrentUserUseCase(repo).execute('u1');
    expect(user).toEqual({ id: 'u1', nome: 'Ada', email: 'ada@example.com' });
  });

  it('returns null when the current user no longer exists', async () => {
    const repo = new FakeUserRepository(null);
    expect(await new GetCurrentUserUseCase(repo).execute('u1')).toBeNull();
  });
});
