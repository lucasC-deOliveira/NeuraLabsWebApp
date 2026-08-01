import { IsEmail, IsString, MinLength } from 'class-validator';

// Mensagens em português: elas chegam ao usuário no campo do formulário. O padrão
// do class-validator é inglês ("email must be an email").
const EMAIL_MESSAGE = 'Informe um email válido';
const SENHA_MIN_LENGTH = 6;

export class RegisterDto {
  @IsString({ message: 'Informe seu nome' })
  @MinLength(1, { message: 'Informe seu nome' })
  nome!: string;

  @IsEmail({}, { message: EMAIL_MESSAGE })
  email!: string;

  @IsString({ message: 'Informe uma senha' })
  @MinLength(SENHA_MIN_LENGTH, { message: `A senha precisa de pelo menos ${SENHA_MIN_LENGTH} caracteres` })
  senha!: string;
}

export class LoginDto {
  @IsEmail({}, { message: EMAIL_MESSAGE })
  email!: string;

  @IsString({ message: 'Informe sua senha' })
  senha!: string;
}
