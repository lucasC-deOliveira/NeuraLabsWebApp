import { prismaClient } from '@/shared/infrastructure/database/prisma.client'
import { PrismaUserRepository } from './infrastructure/prisma-user-repository.adapter'
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher.adapter'
import { JwtSessionTokenService } from './infrastructure/jwt-session-token-service.adapter'
import { InMemoryRateLimiterAdapter } from './infrastructure/in-memory-rate-limiter.adapter'
import { CookieSessionReader } from './infrastructure/cookie-session.service'
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case'
import { LoginUserUseCase } from './application/use-cases/login-user.use-case'
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case'
import { RequireAuthenticatedUserUseCase } from './application/use-cases/require-authenticated-user.use-case'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production.')
}

const jwtSecret = process.env.JWT_SECRET ?? 'dev-only-insecure-do-not-use'

const userRepository = new PrismaUserRepository(prismaClient)
const passwordHasher = new BcryptPasswordHasher()
const sessionTokenService = new JwtSessionTokenService(jwtSecret)
const rateLimiter = new InMemoryRateLimiterAdapter()
const sessionCookieReader = new CookieSessionReader()

export const authContainer = {
  registerUser: new RegisterUserUseCase(userRepository, passwordHasher, sessionTokenService),
  loginUser: new LoginUserUseCase(
    userRepository,
    passwordHasher,
    sessionTokenService,
    rateLimiter,
  ),
  getCurrentUser: new GetCurrentUserUseCase(
    userRepository,
    sessionTokenService,
    sessionCookieReader,
  ),
  requireAuthenticatedUser: new RequireAuthenticatedUserUseCase(
    sessionTokenService,
    sessionCookieReader,
  ),
}
