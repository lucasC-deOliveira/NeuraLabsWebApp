import type { AuthenticatedUser, UserCredentials } from '../user';

export interface NewUser {
  nome: string;
  email: string;
  senhaHash: string;
}

// Persistence port for user accounts.
export interface UserRepository {
  findByEmail(email: string): Promise<UserCredentials | null>;
  findById(id: string): Promise<AuthenticatedUser | null>;
  create(user: NewUser): Promise<AuthenticatedUser>;
  touchLastAccess(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
