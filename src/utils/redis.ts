import { Redis } from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  console.log('Redis client initialized');
} else {
  console.log('No REDIS_URL found, caching disabled');
}

const DEFAULT_TTL = 86400;

export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  
  try {
    const data = await redis.get(key);
    if (!data) return null;
    
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Redis cache get error:', error);
    try {
      await redis.del(key);
    } catch {
    }
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
  if (!redis) return;
  
  try {
    const jsonData = JSON.stringify(data);
    
    await redis.setex(key, ttl, jsonData);
    console.log(`Successfully cached data for key: ${key}, TTL: ${ttl}s`);
  } catch (error) {
    console.error(`Redis cache set error for key ${key}:`, error);
    try {
      await redis.del(key);
    } catch {
    }
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
}