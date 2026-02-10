type RateLimitState = {
  count: number;
  resetAtMs: number;
};

type RateLimitInput = {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  resetAtMs: number;
  key: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __clawgencyRateLimits: Map<string, RateLimitState> | undefined;
}

function rateLimitStore(): Map<string, RateLimitState> {
  if (!global.__clawgencyRateLimits) {
    global.__clawgencyRateLimits = new Map<string, RateLimitState>();
  }
  return global.__clawgencyRateLimits;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function cleanupExpired(nowMs: number) {
  const store = rateLimitStore();
  if (store.size < 2048) {
    return;
  }
  for (const [key, state] of store.entries()) {
    if (state.resetAtMs <= nowMs) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(input: RateLimitInput): RateLimitResult {
  const limit = Math.max(1, Math.floor(input.limit));
  const windowMs = Math.max(1_000, Math.floor(input.windowMs));
  const nowMs = Date.now();
  cleanupExpired(nowMs);

  const ip = clientIp(input.request);
  const key = `${input.scope}:${ip}`;
  const store = rateLimitStore();
  const current = store.get(key);

  if (!current || current.resetAtMs <= nowMs) {
    const next: RateLimitState = {
      count: 1,
      resetAtMs: nowMs + windowMs
    };
    store.set(key, next);
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSec: Math.ceil(windowMs / 1000),
      resetAtMs: next.resetAtMs,
      key
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000)),
      resetAtMs: current.resetAtMs,
      key
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000)),
    resetAtMs: current.resetAtMs,
    key
  };
}
