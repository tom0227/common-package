import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditLogEntry } from './audit.service';
import { PrismaService } from '../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get(PrismaService);
  });

  describe('log', () => {
    it('監査ログエントリをデータベースに記録する', async () => {
      const mockAuditLog = {
        id: '1',
        userId: 'admin-456',
        action: 'CREATE_USER',
        resourceType: 'User',
        resourceId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        result: 'SUCCESS',
        metadata: { name: 'John Doe' },
        createdAt: new Date(),
      };

      prismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const entry: AuditLogEntry = {
        userId: 'admin-456',
        action: 'CREATE_USER',
        resourceType: 'User',
        resourceId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        result: 'SUCCESS',
        metadata: { name: 'John Doe' },
      };

      await service.log(entry);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-456',
          action: 'CREATE_USER',
          resourceType: 'User',
          resourceId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          result: 'SUCCESS',
          error: undefined,
          beforeData: undefined,
          afterData: undefined,
          metadata: { name: 'John Doe' },
        },
      });
    });

    it('beforeDataとafterDataを含む監査ログを記録する', async () => {
      const mockAuditLog = {
        id: '2',
        userId: 'user-456',
        action: 'UPDATE_PROFILE',
        resourceType: 'UserProfile',
        resourceId: 'profile-123',
        ipAddress: '127.0.0.1',
        userAgent: 'browser-agent',
        result: 'SUCCESS',
        beforeData: { name: 'Old Name' },
        afterData: { name: 'New Name' },
        createdAt: new Date(),
      };

      prismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const entry: AuditLogEntry = {
        userId: 'user-456',
        action: 'UPDATE_PROFILE',
        resourceType: 'UserProfile',
        resourceId: 'profile-123',
        ipAddress: '127.0.0.1',
        userAgent: 'browser-agent',
        result: 'SUCCESS',
        beforeData: { name: 'Old Name' },
        afterData: { name: 'New Name' },
      };

      await service.log(entry);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          action: 'UPDATE_PROFILE',
          resourceType: 'UserProfile',
          resourceId: 'profile-123',
          ipAddress: '127.0.0.1',
          userAgent: 'browser-agent',
          result: 'SUCCESS',
          error: undefined,
          beforeData: { name: 'Old Name' },
          afterData: { name: 'New Name' },
          metadata: undefined,
        },
      });
    });

    it('失敗したアクションをエラー情報と共に記録する', async () => {
      const mockAuditLog = {
        id: '3',
        userId: 'user-123',
        action: 'DELETE_USER',
        resourceType: 'User',
        resourceId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'admin-client',
        result: 'FAILED',
        error: 'Insufficient permissions',
        createdAt: new Date(),
      };

      prismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const entry: AuditLogEntry = {
        userId: 'user-123',
        action: 'DELETE_USER',
        resourceType: 'User',
        resourceId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'admin-client',
        result: 'FAILED',
        error: 'Insufficient permissions',
      };

      await service.log(entry);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'DELETE_USER',
          resourceType: 'User',
          resourceId: 'user-456',
          ipAddress: '192.168.1.1',
          userAgent: 'admin-client',
          result: 'FAILED',
          error: 'Insufficient permissions',
          beforeData: undefined,
          afterData: undefined,
          metadata: undefined,
        },
      });
    });

    it('データベースエラーが発生した場合はコンソールエラーを出力', async () => {
      const error = new Error('Database connection failed');
      prismaService.auditLog.create.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const entry: AuditLogEntry = {
        userId: 'user-123',
        action: 'TEST_ACTION',
        resourceType: 'Test',
        resourceId: 'test-id',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        result: 'SUCCESS',
      };

      await service.log(entry);

      expect(consoleSpy).toHaveBeenCalledWith('監査ログの記録に失敗しました:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('getAuditLogs', () => {
    it('指定した条件で監査ログを取得する', async () => {
      const mockLogs = [
        {
          id: '1',
          userId: 'admin-456',
          action: 'CREATE_USER',
          resourceType: 'User',
          resourceId: 'user-123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          result: 'SUCCESS',
          createdAt: new Date('2023-01-01'),
          user: {
            id: 'admin-456',
            email: 'admin@example.com',
            name: 'Admin User',
          },
        },
        {
          id: '2',
          userId: 'admin-456',
          action: 'UPDATE_USER',
          resourceType: 'User',
          resourceId: 'user-123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          result: 'SUCCESS',
          createdAt: new Date('2023-01-02'),
          user: {
            id: 'admin-456',
            email: 'admin@example.com',
            name: 'Admin User',
          },
        },
      ];

      prismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs({
        resourceType: 'User',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockLogs);
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          resourceType: 'User',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('日付範囲でフィルタリングして監査ログを取得する', async () => {
      const mockLogs: Array<{
        id: string;
        userId: string;
        action: string;
        resourceType: string;
        resourceId: string;
        ipAddress: string;
        userAgent: string;
        result: string;
        createdAt: Date;
        user: {
          id: string;
          email: string;
          name: string;
        };
      }> = [];
      prismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      await service.getAuditLogs({
        startDate,
        endDate,
        limit: 20,
        offset: 0,
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('ユーザーIDでフィルタリングして監査ログを取得する', async () => {
      const mockLogs: Array<{
        id: string;
        userId: string;
        action: string;
        resourceType: string;
        resourceId: string;
        ipAddress: string;
        userAgent: string;
        result: string;
        createdAt: Date;
        user: {
          id: string;
          email: string;
          name: string;
        };
      }> = [];
      prismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs({
        userId: 'user-123',
        limit: 5,
        offset: 5,
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
        skip: 5,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('アクションでフィルタリングして監査ログを取得する', async () => {
      const mockLogs: Array<{
        id: string;
        userId: string;
        action: string;
        resourceType: string;
        resourceId: string;
        ipAddress: string;
        userAgent: string;
        result: string;
        createdAt: Date;
        user: {
          id: string;
          email: string;
          name: string;
        };
      }> = [];
      prismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs({
        action: 'DELETE_USER',
        limit: 10,
        offset: 0,
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'DELETE_USER',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('デフォルトのlimitとoffsetを使用する', async () => {
      const mockLogs: Array<{
        id: string;
        userId: string;
        action: string;
        resourceType: string;
        resourceId: string;
        ipAddress: string;
        userAgent: string;
        result: string;
        createdAt: Date;
        user: {
          id: string;
          email: string;
          name: string;
        };
      }> = [];
      prismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs({});

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });
  });
});
