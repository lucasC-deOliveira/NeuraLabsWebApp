import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { SessionTokenService } from '../../domain/ports/session-token-service.port'
import type { RateLimiter } from '../../domain/ports/rate-limiter.port'
import {
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '@/shared/errors/application.error'

export interface LoginUserInput {
  email: string
  password: string
  ipAddress: string
}

export interface LoginUserOutput {
  user: { id: string; name: string; email: string }
  sessionToken: string
}

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionTokenService: SessionTokenService,
    private readonly rateLimiter: RateLimiter,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const email = (input.email ?? '').trim().toLowerCase()

    if (!email || !input.password) {
      throw new ValidationError('Email e senha são obrigatórios')
    }

    const rateLimitKey = `login:${input.ipAddress}:${email}`
    const { allowed, retryAfter } = this.rateLimiter.check(rateLimitKey)
    if (!allowed) {
      throw new TooManyRequestsError(retryAfter!)
    }

    const user = await this.userRepository.findByEmail(email)
    if (!user) throw new UnauthorizedError()

    const isValid = await this.passwordHasher.verify(input.password, user.passwordHash)
    if (!isValid) throw new UnauthorizedError()

    this.rateLimiter.reset(rateLimitKey)
    await this.userRepository.updateLastAccess(user.id)
    const sessionToken = await this.sessionTokenService.sign(user.id)

    return { user: user.toPublicProfile(), sessionToken }
  }
}
