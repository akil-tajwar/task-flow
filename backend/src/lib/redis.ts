import { createClient } from 'redis';
import { env } from './env';

export const redis = createClient({ url: env.REDIS_URL });

redis.on('error', (err) => console.error('Redis error:', err));

export const connectRedis = async () => {
  await redis.connect();
  console.log('Redis connected');
};
