import Redis from 'ioredis';

// Create Redis client with connection pooling
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  keepAlive: 30000,
});

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('ready', () => {
  console.log('🚀 Redis ready for operations');
});

// Test connection on startup
redis.ping().then((result) => {
  console.log('📡 Redis PING:', result);
}).catch((err) => {
  console.error('❌ Redis PING failed:', err);
});

export default redis;
