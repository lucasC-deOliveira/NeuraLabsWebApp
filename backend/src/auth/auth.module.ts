import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { USER_REPOSITORY, type UserRepository } from '../modules/auth/domain/ports/user-repository';
import { PASSWORD_HASHER, type PasswordHasher } from '../modules/auth/domain/ports/password-hasher';
import { TOKEN_ISSUER, type TokenIssuer } from '../modules/auth/domain/ports/token-issuer';
import { PrismaUserRepository } from '../modules/auth/infrastructure/persistence/prisma-user.repository';
import { BcryptPasswordHasher } from '../modules/auth/infrastructure/security/bcrypt-password-hasher';
import { JwtTokenIssuer } from '../modules/auth/infrastructure/security/jwt-token-issuer';
import { RegisterUserUseCase } from '../modules/auth/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../modules/auth/application/use-cases/login-user.use-case';
import { GetCurrentUserUseCase } from '../modules/auth/application/use-cases/get-current-user.use-case';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-only-insecure-do-not-use',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtAuthGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    {
      provide: RegisterUserUseCase,
      useFactory: (repo: UserRepository, hasher: PasswordHasher, token: TokenIssuer) =>
        new RegisterUserUseCase(repo, hasher, token),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
    },
    {
      provide: LoginUserUseCase,
      useFactory: (repo: UserRepository, hasher: PasswordHasher, token: TokenIssuer) =>
        new LoginUserUseCase(repo, hasher, token),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
    },
    {
      provide: GetCurrentUserUseCase,
      useFactory: (repo: UserRepository) => new GetCurrentUserUseCase(repo),
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
