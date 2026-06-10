import { redirect } from 'next/navigation'
import type { SessionTokenService } from '../../domain/ports/session-token-service.port'
import type { SessionCookieReader } from '../../domain/ports/session-cookie.port'

export class RequireAuthenticatedUserUseCase {
  constructor(
    private readonly sessionTokenService: SessionTokenService,
    private readonly sessionCookieReader: SessionCookieReader,
  ) {}

  async execute(): Promise<string> {
    const token = await this.sessionCookieReader.read()
    if (!token) redirect('/login')

    const userId = await this.sessionTokenService.verify(token)
    if (!userId) redirect('/login')

    return userId
  }
}
