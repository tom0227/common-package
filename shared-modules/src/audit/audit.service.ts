import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type AuditDataPayload = Record<string, unknown> | null | undefined;

export interface AuditLogEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  result: 'SUCCESS' | 'FAILED';
  error?: string;
  beforeData?: AuditDataPayload;
  afterData?: AuditDataPayload;
  metadata?: AuditDataPayload;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // 型アサーションを使用して動的なPrismaスキーマに対応
      // 各サービスのPrismaスキーマにauditLogモデルが存在する必要がある
      const prismaWithAuditLog = this.prisma as PrismaService & {
        auditLog: {
          create: (args: { data: AuditLogEntry }) => Promise<unknown>;
        };
      };

      await prismaWithAuditLog.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          result: entry.result,
          error: entry.error,
          beforeData: entry.beforeData,
          afterData: entry.afterData,
          metadata: entry.metadata,
        },
      });
    } catch (error) {
      console.error('監査ログの記録に失敗しました:', error);
    }
  }

  async getAuditLogs(options: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<unknown[]> {
    const where: {
      userId?: string;
      resourceType?: string;
      action?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (options.userId) where.userId = options.userId;
    if (options.resourceType) where.resourceType = options.resourceType;
    if (options.action) where.action = options.action;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    // 型アサーションを使用して動的なPrismaスキーマに対応
    const prismaWithAuditLog = this.prisma as PrismaService & {
      auditLog: {
        findMany: (args: {
          where: typeof where;
          orderBy: { createdAt: string };
          take: number;
          skip: number;
          include: {
            user: {
              select: {
                id: boolean;
                email: boolean;
                name: boolean;
              };
            };
          };
        }) => Promise<unknown[]>;
      };
    };

    return await prismaWithAuditLog.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
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
  }
}
