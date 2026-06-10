export interface SessionTokenService {
  sign(userId: string): Promise<string>
  verify(token: string): Promise<string | null>
}
