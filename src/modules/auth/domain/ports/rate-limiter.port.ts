export interface RateLimiter {
  check(key: string): { allowed: boolean; retryAfter?: number }
  reset(key: string): void
}
