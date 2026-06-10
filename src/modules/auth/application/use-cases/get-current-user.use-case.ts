import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { SessionTokenService } from '../../domain/ports/session-token-service.port'
import type { SessionCookieReader } from '../../domain/ports/session-cookie.port'

export interface GetCurrentUserOutput {
  user: { id: string; name: string; email: string } | null
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionTokenService: SessionTokenService,
    private readonly sessionCookieReader: SessionCookieReader,
  ) {}

  async execute(): Promise<GetCurrentUserOutput> {
    const token = await this.sessionCookieReader.read()
    if (!token) return { user: null }

    const userId = await this.sessionTokenService.verify(token)
    if (!userId) return { user: null }

    const user = await this.userRepository.findById(userId)
    return { user: user ? user.toPublicProfile() : null }
  }
}
