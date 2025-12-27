import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

const prismaClientMocks = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  transaction: jest.fn(),
  on: jest.fn(),
  queryRaw: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(function (this: any) {
    this.$connect = prismaClientMocks.connect;
    this.$disconnect = prismaClientMocks.disconnect;
    this.$transaction = prismaClientMocks.transaction;
    this.$on = prismaClientMocks.on;
    this.$queryRaw = prismaClientMocks.queryRaw;
  }),
}));

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    prismaClientMocks.connect.mockReset();
    prismaClientMocks.disconnect.mockReset();
    prismaClientMocks.transaction.mockReset();
    prismaClientMocks.on.mockReset();
    prismaClientMocks.queryRaw.mockReset();

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get(ConfigService);

    // デフォルト設定
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'database':
          return {
            url: 'postgresql://test:test@localhost:5432/testdb',
            retry: { attempts: 3, delay: 1000 },
            pool: { max: 10 },
          };
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('モジュール初期化時にデータベースに接続する', async () => {
      await service.onModuleInit();

      expect(prismaClientMocks.connect).toHaveBeenCalled();
    });

    it('接続エラーが発生した場合はエラーをスロー', async () => {
      const error = new Error('Connection failed');
      prismaClientMocks.connect.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(
        'データベース接続に失敗しました（最大試行回数 3 回に到達）'
      );
    });

    it('リトライ機能をテストする', async () => {
      prismaClientMocks.connect
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(undefined);

      await service.onModuleInit();

      expect(prismaClientMocks.connect).toHaveBeenCalledTimes(3);
    });
  });

  describe('onModuleDestroy', () => {
    it('モジュール終了時にデータベース接続を切断する', async () => {
      await service.onModuleDestroy();

      expect(prismaClientMocks.disconnect).toHaveBeenCalled();
    });

    it('切断エラーが発生した場合はログに記録するがエラーをスローしない', async () => {
      const error = new Error('Disconnect failed');
      prismaClientMocks.disconnect.mockRejectedValue(error);

      // エラーをスローしないことを確認
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('データベースのヘルスチェックを実行する', async () => {
      prismaClientMocks.queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.info?.reconnectAttempts).toBeDefined();
      expect(prismaClientMocks.queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('データベース接続エラーの場合はunhealthyを返す', async () => {
      const error = new Error('Connection error');
      prismaClientMocks.queryRaw.mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.info?.error).toBe('Connection error');
    });
  });

  describe('getDatabaseMetrics', () => {
    it('データベースメトリクスを取得する', async () => {
      const mockStats = [
        { state: 'active', count: 5 },
        { state: 'idle', count: 3 },
      ];

      prismaClientMocks.queryRaw.mockResolvedValue(mockStats);

      const result = await service.getDatabaseMetrics();

      expect(result).toEqual({
        activeConnections: 5,
        idleConnections: 3,
        totalConnections: 8,
      });
    });

    it('メトリクス取得エラーの場合は空オブジェクトを返す', async () => {
      prismaClientMocks.queryRaw.mockRejectedValue(new Error('Query failed'));

      const result = await service.getDatabaseMetrics();

      expect(result).toEqual({});
    });
  });

  describe('configuration', () => {
    it('設定が正しく適用される', () => {
      expect(service).toBeDefined();
      expect(service['maxReconnectAttempts']).toBe(3);
      expect(service['reconnectDelay']).toBe(1000);
    });

    it('デフォルト設定が使用される', () => {
      configService.get.mockReturnValue(undefined);

      // 新しいサービスインスタンスを作成
      const newService = new PrismaService(configService);

      expect(newService['maxReconnectAttempts']).toBe(3);
      expect(newService['reconnectDelay']).toBe(1000);
    });
  });

  describe('event listeners', () => {
    it('イベントリスナーが設定される', () => {
      expect(prismaClientMocks.on).toHaveBeenCalledWith('query', expect.any(Function));
      expect(prismaClientMocks.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(prismaClientMocks.on).toHaveBeenCalledWith('warn', expect.any(Function));
      expect(prismaClientMocks.on).toHaveBeenCalledWith('info', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('Prismaエラーを適切にハンドリングする', async () => {
      // Prisma固有のエラーをシミュレート
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: {
          target: ['email'],
        },
      };

      jest.spyOn(service, '$connect').mockRejectedValue(prismaError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'データベース接続に失敗しました（最大試行回数 3 回に到達）'
      );
    });
  });

  describe('private methods', () => {
    it('delay メソッドが正しく動作する', async () => {
      const start = Date.now();
      await service['delay'](100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(100);
      expect(end - start).toBeLessThan(150); // 余裕を持たせる
    });
  });
});
