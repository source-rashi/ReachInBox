import { createRedisConnection } from '../lib/redis';

const redis = createRedisConnection();

const MAX_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100');

// Lua script for atomic increment-and-check within the current hour window.
// Returns [current_count, ttl_remaining]. If count exceeds limit, the caller
// must reschedule rather than send.
const LUA_INCREMENT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local current = redis.call('INCR', key)
  if current == 1 then
    redis.call('EXPIRE', key, 3600)
  end
  local ttl = redis.call('TTL', key)
  return {current, ttl}
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

export async function checkAndIncrement(senderId: string): Promise<RateLimitResult> {
  const bucket = getHourBucket();
  const key = `ratelimit:${senderId}:${bucket}`;

  const result = await redis.eval(LUA_INCREMENT, 1, key, MAX_PER_HOUR) as [number, number];
  const [currentCount, ttlSeconds] = result;

  if (currentCount > MAX_PER_HOUR) {
    // Decrement back since we won't actually send
    await redis.decr(key);
    return {
      allowed: false,
      currentCount: currentCount - 1,
      retryAfterMs: ttlSeconds * 1000 + 1000, // wait for next window + 1s buffer
    };
  }

  return { allowed: true, currentCount, retryAfterMs: 0 };
}
