import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

export const CacheConfig = CacheModule.registerAsync({
  useFactory: async () => {
    const store = await redisStore({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      ttl: 30, // seconds
    });

    return {
      store,
      ttl: 30,
    };
  },
  isGlobal: true,
});
