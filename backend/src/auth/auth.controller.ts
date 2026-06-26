import { Body, Controller, Get, Post, UseFilters, UseGuards } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { RegisterUserUseCase } from '../modules/auth/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../modules/auth/application/use-cases/login-user.use-case';
import { GetCurrentUserUseCase } from '../modules/auth/application/use-cases/get-current-user.use-case';
import { AuthExceptionFilter } from '../modules/auth/interface/auth-exception.filter';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUser.execute(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.loginUser.execute(dto);
  }

  @Post('logout')
  logout() {
    // Bearer: o cliente apenas descarta o token.
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() userId: string) {
    return this.getCurrentUser.execute(userId);
  }
}
