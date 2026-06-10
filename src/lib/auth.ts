// ---------------------------------------------------------------------------
// Backward-compatible facade — all logic lives in src/modules/auth/
// Import from here to keep existing server actions and pages working.
// ---------------------------------------------------------------------------
import { authContainer } from '@/modules/auth/container'
import { BcryptPasswordHasher } from '@/modules/auth/infrastructure/bcrypt-password-hasher.adapter'
import { JwtSessionTokenService } from '@/modules/auth/infrastructure/jwt-session-token-service.adapter'
import { CookieSessionReader } from '@/modules/auth/infrastructure/cookie-session.service'

export {
  attachSessionCookie as setSessionCookieResponse,
  clearSessionCookie,
} from '@/modules/auth/infrastructure/cookie-session.service'

const jwtSecret = process.env.JWT_SECRET ?? 'dev-only-insecure-do-not-use'
const _hasher = new BcryptPasswordHasher()
const _tokenService = new JwtSessionTokenService(jwtSecret)

export async function hashPassword(password: string): Promise<string> {
  return _hasher.hash(password)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return _hasher.verify(password, hashed)
}

export async function createSessionToken(userId: string): Promise<string> {
  return _tokenService.sign(userId)
}

export async function requireUserId(): Promise<string> {
  return authContainer.requireAuthenticatedUser.execute()
}

export async function getSessionUserId(): Promise<string | null> {
  const token = await new CookieSessionReader().read()
  if (!token) return null
  return _tokenService.verify(token)
}

export async function getCurrentUser(): Promise<{ id: string; name: string; email: string } | null> {
  const { user } = await authContainer.getCurrentUser.execute()
  return user
}
