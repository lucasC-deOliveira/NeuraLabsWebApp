import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenIssuer } from '../../domain/ports/token-issuer';

// ACL over @nestjs/jwt for issuance: signs the user id as the token subject.
// Secret and expiry are configured where JwtModule is registered.
@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  issue(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}
