import { EmailAlreadyRegisteredError } from '../../domain/errors';
import type { PasswordHasher } from '../../domain/ports/password-hasher';
import type { TokenIssuer } from '../../domain/ports/token-issuer';
import type { UserRepository } from '../../domain/ports/user-repository';
import { normalizeEmail } from '../../domain/services/email';
import type { AuthResult, RegisterCommand } from '../../domain/user';

/**
 * Registers a new account and returns an access token, rejecting a duplicate
 * email.
 * @example registerUser.execute({ nome: 'Ada', email: 'a@b.com', senha: '...' })
 */
export class RegisterUserUseCase {
  constructor(
    private readonly repo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly token: TokenIssuer,
  ) {}

  async execute(command: RegisterCommand): Promise<AuthResult> {
    const email = normalizeEmail(command.email);
    if (await this.repo.findByEmail(email)) throw new EmailAlreadyRegisteredError();
    const senhaHash = await this.hasher.hash(command.senha);
    const user = await this.repo.create({ nome: command.nome.trim(), email, senhaHash });
    return { token: await this.token.issue(user.id), user };
  }
}
