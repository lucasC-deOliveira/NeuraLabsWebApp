// In-memory fixed-window rate limiter.
// Resets on process restart. For multi-instance deployments replace the Map
// with a shared store (Redis, etc.).

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}, 60_000)

export function checkRateLimit(
  key: string,
  opts: { windowMs?: number; max?: number } = {}
): {
  allowed: boolean
  retryAfter?: number
} {
  const windowMs = opts.windowMs ?? WINDOW_MS
  const max = opts.max ?? MAX_ATTEMPTS
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { allowed: true }
}

export function resetRateLimit(key: string): void {
  store.delete(key)
}
