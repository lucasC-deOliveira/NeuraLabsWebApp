import type { UserRepository } from '../../domain/ports/user-repository';
import type { AuthenticatedUser } from '../../domain/user';

/**
 * Loads the authenticated user's public identity, or null if it no longer exists.
 * @example getCurrentUser.execute('user-id')
 */
export class GetCurrentUserUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(userId: string): Promise<AuthenticatedUser | null> {
    return this.repo.findById(userId);
  }
}
