import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto';

export interface AuthResult {
  token: string;
  user: { id: string; nome: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.usuario.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Já existe uma conta com este email');

    const senhaHash = await hash(dto.senha, 10);
    const user = await this.prisma.usuario.create({
      data: { nome: dto.nome.trim(), email, senhaHash },
    });
    return { token: await this.sign(user.id), user: { id: user.id, nome: user.nome, email: user.email } };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user || !(await compare(dto.senha, user.senhaHash))) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }
    await this.prisma.usuario.update({ where: { id: user.id }, data: { ultimoAcesso: new Date() } });
    return { token: await this.sign(user.id), user: { id: user.id, nome: user.nome, email: user.email } };
  }

  async me(userId: string): Promise<{ id: string; nome: string; email: string } | null> {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
    return user ? { id: user.id, nome: user.nome, email: user.email } : null;
  }
}
