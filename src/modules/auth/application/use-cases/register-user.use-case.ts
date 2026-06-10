import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { SessionTokenService } from '../../domain/ports/session-token-service.port'
import { ConflictError, ValidationError } from '@/shared/errors/application.error'

export interface RegisterUserInput {
  name: string
  email: string
  password: string
}

export interface RegisterUserOutput {
  user: { id: string; name: string; email: string }
  sessionToken: string
}

const MIN_PASSWORD_LENGTH = 8
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = (input.email ?? '').trim().toLowerCase()
    const name = (input.name ?? '').trim()

    if (!name || !email || !input.password) {
      throw new ValidationError('Nome, email e senha são obrigatórios')
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError('Senha deve ter no mínimo 8 caracteres')
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError('Email inválido')
    }

    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw new ConflictError('Email já está em uso')
    }

    const passwordHash = await this.passwordHasher.hash(input.password)
    const user = await this.userRepository.create({ name, email, passwordHash })
    const sessionToken = await this.sessionTokenService.sign(user.id)

    return { user: user.toPublicProfile(), sessionToken }
  }
}
