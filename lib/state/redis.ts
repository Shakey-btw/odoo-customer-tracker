import { Redis } from "@upstash/redis";

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing Upstash Redis credentials. " +
        "Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
      );
    }

    redis = new Redis({
      url,
      token
    });
  }

  return redis;
}

// Export convenience methods
export const redisClient = {
  // Set operations
  sadd: (key: string, ...members: string[]) => getRedisClient().sadd(key, ...members),
  sismember: (key: string, member: string) => getRedisClient().sismember(key, member),
  smembers: (key: string) => getRedisClient().smembers(key),
  scard: (key: string) => getRedisClient().scard(key),
  srem: (key: string, ...members: string[]) => getRedisClient().srem(key, ...members),

  // String operations
  get: (key: string) => getRedisClient().get(key),
  set: (key: string, value: string | number) => getRedisClient().set(key, value),
  del: (...keys: string[]) => getRedisClient().del(...keys),

  // Hash operations
  hset: (key: string, field: string, value: string | number) =>
    getRedisClient().hset(key, { [field]: value }),
  hget: (key: string, field: string) => getRedisClient().hget(key, field),
  hgetall: (key: string) => getRedisClient().hgetall(key),
  hincrby: (key: string, field: string, increment: number) =>
    getRedisClient().hincrby(key, field, increment),

  // TTL operations
  expire: (key: string, seconds: number) => getRedisClient().expire(key, seconds),
  ttl: (key: string) => getRedisClient().ttl(key),

  // List operations
  lpush: (key: string, ...elements: string[]) => getRedisClient().lpush(key, ...elements),
  rpush: (key: string, ...elements: string[]) => getRedisClient().rpush(key, ...elements),
  lrange: (key: string, start: number, stop: number) => getRedisClient().lrange(key, start, stop),

  // Key operations
  exists: (...keys: string[]) => getRedisClient().exists(...keys),
  keys: (pattern: string) => getRedisClient().keys(pattern)
};
