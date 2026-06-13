import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  senha!: string;
}
