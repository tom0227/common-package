import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';
import type { RedisClientType } from 'redis';

describe('CacheService', () => {
  let service: CacheService;
  let redis: jest.Mocked<RedisClientType>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<RedisClientType>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    configService.get.mockImplementation((key: string) => {
      if (key === 'cache.ttl') {
        return 300;
      }
      return undefined;
    });

    service = new CacheService(redis, configService);
  });

  describe('get', () => {
    it('JSON文字列をパースして返す', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      await expect(service.get<{ foo: string }>('key')).resolves.toEqual({ foo: 'bar' });
      expect(redis.get).toHaveBeenCalledWith('key');
    });

    it('値が存在しない場合はnullを返す', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.get('missing')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('デフォルトTTLで保存する', async () => {
      await service.set('key', { value: 1 });
      expect(redis.setEx).toHaveBeenCalledWith('key', 300, JSON.stringify({ value: 1 }));
    });

    it('カスタムTTLを使用する', async () => {
      await service.set('key', 'value', 60);
      expect(redis.setEx).toHaveBeenCalledWith('key', 60, JSON.stringify('value'));
    });
  });

  describe('del', () => {
    it('指定したキーを削除する', async () => {
      await service.del('key');
      expect(redis.del).toHaveBeenCalledWith('key');
    });
  });

  describe('delPattern', () => {
    it('一致するキーを削除する', async () => {
      redis.keys.mockResolvedValue(['a', 'b']);
      await service.delPattern('prefix:*');

      expect(redis.keys).toHaveBeenCalledWith('prefix:*');
      expect(redis.del).toHaveBeenCalledWith(['a', 'b']);
    });

    it('一致するキーが無い場合は削除しない', async () => {
      redis.keys.mockResolvedValue([]);
      await service.delPattern('empty:*');
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('存在するキーはtrueを返す', async () => {
      redis.exists.mockResolvedValue(1);
      await expect(service.exists('key')).resolves.toBe(true);
    });

    it('存在しないキーはfalseを返す', async () => {
      redis.exists.mockResolvedValue(0);
      await expect(service.exists('missing')).resolves.toBe(false);
    });
  });
});

