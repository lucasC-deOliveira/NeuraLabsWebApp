// In-memory rate limiter. Resets on process restart; suitable for single-instance apps.
// For multi-instance deployments, replace the Map with a shared store (Redis, etc.).

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
const MAX_ATTEMPTS = 10;

// Purge expired buckets periodically so the Map does not grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}, 60_000);

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
