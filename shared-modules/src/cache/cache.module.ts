import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import { CacheService } from './cache.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const nodeEnv = configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
        const isJest = typeof process.env.JEST_WORKER_ID !== 'undefined';
        const cacheEnabled = configService.get<boolean>('cache.enabled');
        const shouldDisableCache = cacheEnabled === false || nodeEnv === 'test' || isJest;

        if (shouldDisableCache) {
          logger.log('Cache disabled via configuration. Using in-memory mock cache.');
          const store = new Map<string, string>();

          const mockClient = {
            async get(key: string) {
              return store.get(key) ?? null;
            },
            async setEx(key: string, _ttl: number, value: string) {
              store.set(key, value);
              return 'OK';
            },
            async del(keys: string | string[]) {
              const targetKeys = Array.isArray(keys) ? keys : [keys];
              let deleted = 0;
              for (const key of targetKeys) {
                if (store.delete(key)) {
                  deleted += 1;
                }
              }
              return deleted;
            },
            async keys(pattern: string) {
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
              return Array.from(store.keys()).filter((key) => regex.test(key));
            },
            async exists(key: string) {
              return store.has(key) ? 1 : 0;
            },
            on() {
              return this;
            },
            async connect() {
              return undefined;
            },
            async quit() {
              store.clear();
              return undefined;
            },
          } as unknown as RedisClientType;

          return mockClient;
        }

        // 環境変数を直接取得、ネストされた設定パスと両方試す
        const host =
          configService.get('REDIS_HOST') ?? configService.get('cache.redis.host') ?? 'localhost';
        const port =
          configService.get('REDIS_PORT') ?? configService.get('cache.redis.port') ?? 6379;

        logger.log(`Attempting to connect to Redis at ${host}:${port}`);

        const password =
          configService.get('REDIS_PASSWORD') ?? configService.get('cache.redis.password');
        const database = configService.get('REDIS_DB') ?? configService.get('cache.redis.db') ?? 0;

        const client = createClient({
          socket: {
            host,
            port,
            reconnectStrategy: (retries) => {
              // 最大10回リトライ、指数バックオフ
              if (retries > 10) {
                logger.error('Redis connection failed after 10 retries');
                return new Error('Redis connection failed');
              }
              const delay = Math.min(retries * 100, 3000);
              logger.warn(`Redis connection retry ${retries} in ${delay}ms`);
              return delay;
            },
          },
          password: password || undefined,
          database: Number(database),
        });

        // エラーイベントハンドラー
        client.on('error', (err) => {
          logger.error(`Redis Client Error: ${err.message}`);
        });

        client.on('connect', () => {
          logger.log('Redis client connected');
        });

        client.on('ready', () => {
          logger.log('Redis client ready');
        });

        client.on('reconnecting', () => {
          logger.warn('Redis client reconnecting');
        });

        try {
          await client.connect();
          logger.log('Successfully connected to Redis');
          return client;
        } catch (error) {
          logger.error(
            `Failed to connect to Redis: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          throw error;
        }
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
