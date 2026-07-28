import { createRedisConnection } from '../lib/redis';

const redis = createRedisConnection();

// Lua script for atomic check-and-increment within the current hour window.
// Only increments if under the limit. Returns [allowed (0/1), current_count, ttl_remaining].
const LUA_CHECK_AND_INCREMENT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local current = tonumber(redis.call('GET', key) or "0")
  if current >= limit then
    local ttl = redis.call('TTL', key)
    if ttl < 0 then ttl = 3600 end
    return {0, current, ttl}
  end
  local newCount = redis.call('INCR', key)
  if newCount == 1 then
    redis.call('EXPIRE', key, 3600)
  end
  local ttl = redis.call('TTL', key)
  return {1, newCount, ttl}
`;

function getHourBucket(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}:${now.getUTCMonth()}:${now.getUTCDate()}:${now.getUTCHours()}`;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterMs: number;
}

export async function checkAndIncrement(senderId: string, maxPerHour?: number): Promise<RateLimitResult> {
  const limit = maxPerHour || parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100');
  const bucket = getHourBucket();
  const key = `ratelimit:${senderId}:${bucket}`;

  const result = await redis.eval(LUA_CHECK_AND_INCREMENT, 1, key, limit) as [number, number, number];
  const [allowed, currentCount, ttlSeconds] = result;

  if (!allowed) {
    return {
      allowed: false,
      currentCount,
      retryAfterMs: ttlSeconds * 1000 + 1000,
    };
  }

  return { allowed: true, currentCount, retryAfterMs: 0 };
}
