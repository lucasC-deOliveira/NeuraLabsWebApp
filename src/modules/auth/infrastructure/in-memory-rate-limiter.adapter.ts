import type { RateLimiter } from '../domain/ports/rate-limiter.port'
import {
  checkRateLimit,
  resetRateLimit,
} from '@/shared/infrastructure/rate-limiter/in-memory-rate-limiter'

export class InMemoryRateLimiterAdapter implements RateLimiter {
  check(key: string): { allowed: boolean; retryAfter?: number } {
    return checkRateLimit(key)
  }

  reset(key: string): void {
    resetRateLimit(key)
  }
}
