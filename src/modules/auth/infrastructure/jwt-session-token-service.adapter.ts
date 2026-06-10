import { SignJWT, jwtVerify } from 'jose'
import type { SessionTokenService } from '../domain/ports/session-token-service.port'

const SESSION_DURATION = '7d'

export class JwtSessionTokenService implements SessionTokenService {
  private readonly secret: Uint8Array

  constructor(secretKey: string) {
    this.secret = new TextEncoder().encode(secretKey)
  }

  async sign(userId: string): Promise<string> {
    return new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(SESSION_DURATION)
      .sign(this.secret)
  }

  async verify(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify<{ sub: string }>(token, this.secret)
      return payload.sub ?? null
    } catch {
      return null
    }
  }
}
