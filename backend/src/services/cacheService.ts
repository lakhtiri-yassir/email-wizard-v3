import redis from '../config/redis';

export class CacheService {
  // Cache campaign data
  static async cacheCampaign(campaignId: string, data: any, ttl = 3600) {
    const key = `campaign:${campaignId}`;
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`💾 Cached campaign: ${campaignId}`);
  }

  static async getCampaign(campaignId: string) {
    const key = `campaign:${campaignId}`;
    const cached = await redis.get(key);

    if (cached) {
      console.log(`✅ Cache HIT: campaign:${campaignId}`);
      return JSON.parse(cached);
    }

    console.log(`❌ Cache MISS: campaign:${campaignId}`);
    return null;
  }

  // Cache contact list
  static async cacheContacts(userId: string, contacts: any[], ttl = 1800) {
    const key = `contacts:${userId}`;
    await redis.setex(key, ttl, JSON.stringify(contacts));
    console.log(`💾 Cached ${contacts.length} contacts for user ${userId}`);
  }

  static async getContacts(userId: string) {
    const key = `contacts:${userId}`;
    const cached = await redis.get(key);

    if (cached) {
      console.log(`✅ Cache HIT: contacts:${userId}`);
      return JSON.parse(cached);
    }

    return null;
  }

  // Cache dashboard stats
  static async cacheDashboardStats(userId: string, stats: any, ttl = 300) {
    const key = `stats:${userId}`;
    await redis.setex(key, ttl, JSON.stringify(stats));
  }

  static async getDashboardStats(userId: string) {
    const key = `stats:${userId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Increment counters
  static async incrementCounter(key: string, amount = 1) {
    return await redis.incrby(key, amount);
  }

  static async getCounter(key: string) {
    const value = await redis.get(key);
    return value ? parseInt(value) : 0;
  }

  // Rate limiting
  static async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const allowed = current <= maxRequests;
    const remaining = Math.max(0, maxRequests - current);

    return { allowed, remaining };
  }

  // Clear cache
  static async invalidateCache(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  }
}

export default CacheService;
