// Rate limiting simplu, in-memory (suficient pentru Railway single-instance)
// Limiteaza numarul de request-uri per user intr-o fereastra de timp

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Curatare periodica a intrarilor expirate (evita memory leak)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

interface RateLimitOptions {
  windowMs: number
  max: number
}

export function checkRateLimit(key: string, options: RateLimitOptions): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true }
  }

  if (entry.count >= options.max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

export const RATE_LIMITS = {
  general:   { windowMs: 60_000, max: 30 },
  sensitive: { windowMs: 60_000, max: 10 },
  strict:    { windowMs: 5 * 60_000, max: 5 },
}
