import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export function createRedisConnection() {
  const isTls = redisUrl.startsWith('rediss://');
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
  });
}

