const DEFAULT_LIMITS = {
  admin: { max: 60, windowMs: 60_000 },
  command: { max: 120, windowMs: 60_000 },
  ingest: { max: 240, windowMs: 60_000 },
  provisioning: { max: 60, windowMs: 60_000 },
  mutating: { max: 120, windowMs: 60_000 }
};

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildRateLimitConfig(env = process.env) {
  return {
    enabled: (env.BACKEND_RATE_LIMIT_ENABLED ?? "true") === "true",
    admin: {
      max: parsePositiveInt(env.BACKEND_RATE_LIMIT_ADMIN_MAX, DEFAULT_LIMITS.admin.max),
      windowMs: parsePositiveInt(env.BACKEND_RATE_LIMIT_ADMIN_WINDOW_MS, DEFAULT_LIMITS.admin.windowMs)
    },
    command: {
      max: parsePositiveInt(env.BACKEND_RATE_LIMIT_COMMAND_MAX, DEFAULT_LIMITS.command.max),
      windowMs: parsePositiveInt(env.BACKEND_RATE_LIMIT_COMMAND_WINDOW_MS, DEFAULT_LIMITS.command.windowMs)
    },
    ingest: {
      max: parsePositiveInt(env.BACKEND_RATE_LIMIT_INGEST_MAX, DEFAULT_LIMITS.ingest.max),
      windowMs: parsePositiveInt(env.BACKEND_RATE_LIMIT_INGEST_WINDOW_MS, DEFAULT_LIMITS.ingest.windowMs)
    },
    provisioning: {
      max: parsePositiveInt(env.BACKEND_RATE_LIMIT_PROVISIONING_MAX, DEFAULT_LIMITS.provisioning.max),
      windowMs: parsePositiveInt(env.BACKEND_RATE_LIMIT_PROVISIONING_WINDOW_MS, DEFAULT_LIMITS.provisioning.windowMs)
    },
    mutating: {
      max: parsePositiveInt(env.BACKEND_RATE_LIMIT_MUTATING_MAX, DEFAULT_LIMITS.mutating.max),
      windowMs: parsePositiveInt(env.BACKEND_RATE_LIMIT_MUTATING_WINDOW_MS, DEFAULT_LIMITS.mutating.windowMs)
    }
  };
}

export function selectRateLimitPolicy({ method, pathname }, config) {
  if (!config?.enabled) {
    return null;
  }

  if (method === "POST" && pathname === "/api/ingest/telemetry") {
    return { ...config.ingest, bucket: "ingest" };
  }

  if (pathname.startsWith("/api/provisioning/")) {
    return { ...config.provisioning, bucket: "provisioning" };
  }

  if (pathname.startsWith("/api/admin/")) {
    return { ...config.admin, bucket: "admin" };
  }

  if (pathname.startsWith("/api/device/commands")) {
    return { ...config.command, bucket: "command" };
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { ...config.mutating, bucket: "mutating" };
  }

  return null;
}

export function createRateLimiter({ now = () => Date.now() } = {}) {
  const buckets = new Map();

  return {
    check({ key, policy }) {
      if (!policy || policy.max <= 0 || policy.windowMs <= 0) {
        return { allowed: true, remaining: Number.POSITIVE_INFINITY, resetAt: 0 };
      }

      const currentTime = now();
      const existing = buckets.get(key);
      const entry = !existing || existing.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + policy.windowMs }
        : existing;

      entry.count += 1;
      buckets.set(key, entry);

      const remaining = Math.max(policy.max - entry.count, 0);
      if (entry.count > policy.max) {
        return {
          allowed: false,
          remaining,
          resetAt: entry.resetAt,
          retryAfterSec: Math.max(Math.ceil((entry.resetAt - currentTime) / 1000), 1)
        };
      }

      return {
        allowed: true,
        remaining,
        resetAt: entry.resetAt
      };
    },
    reset() {
      buckets.clear();
    }
  };
}

export function getRateLimitKey({ remoteAddress, method, pathname, bucket }) {
  const identity = remoteAddress || "unknown";
  return `${bucket}:${identity}:${method}:${pathname}`;
}
