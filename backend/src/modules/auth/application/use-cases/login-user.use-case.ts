import { InvalidCredentialsError } from '../../domain/errors';
import type { PasswordHasher } from '../../domain/ports/password-hasher';
import type { TokenIssuer } from '../../domain/ports/token-issuer';
import type { UserRepository } from '../../domain/ports/user-repository';
import { normalizeEmail } from '../../domain/services/email';
import { toAuthenticatedUser, type AuthResult, type LoginCommand } from '../../domain/user';

/**
 * Authenticates by email/password, records the access time, and returns a token.
 * Rejects unknown emails and wrong passwords with the same error (no oracle).
 * @example loginUser.execute({ email: 'a@b.com', senha: '...' })
 */
export class LoginUserUseCase {
  constructor(
    private readonly repo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly token: TokenIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResult> {
    const email = normalizeEmail(command.email);
    const found = await this.repo.findByEmail(email);
    if (!found || !(await this.hasher.compare(command.senha, found.senhaHash)))
      throw new InvalidCredentialsError();
    await this.repo.touchLastAccess(found.id);
    return { token: await this.token.issue(found.id), user: toAuthenticatedUser(found) };
  }
}
