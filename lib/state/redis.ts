import { Redis } from "@upstash/redis";

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

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

// Export the client directly - uses lazy initialization
export const redisClient = {
  get client() {
    return getRedisClient();
  }
};
