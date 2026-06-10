import type { User } from '../entities/user.entity'

export interface CreateUserData {
  name: string
  email: string
  passwordHash: string
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: CreateUserData): Promise<User>
  updateLastAccess(id: string): Promise<void>
}
