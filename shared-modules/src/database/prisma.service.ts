import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

interface PrismaLogEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

interface PrismaErrorEvent {
  timestamp: Date;
  message: string;
  target: string;
}

interface PrismaWarnEvent {
  timestamp: Date;
  message: string;
  target: string;
}

interface PrismaInfoEvent {
  timestamp: Date;
  message: string;
  target: string;
}

interface HealthCheckInfo {
  reconnectAttempts?: number;
  maxConnections?: number | undefined;
  error?: string;
}

interface PrismaServiceWithEvents extends PrismaClient {
  $on(event: 'query', callback: (e: PrismaLogEvent) => void): void;
  $on(event: 'error', callback: (e: PrismaErrorEvent) => void): void;
  $on(event: 'warn', callback: (e: PrismaWarnEvent) => void): void;
  $on(event: 'info', callback: (e: PrismaInfoEvent) => void): void;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;

  constructor(private readonly configService: ConfigService) {
    const databaseConfig = configService.get<{
      url?: string;
      retry?: { attempts?: number; delay?: number };
      pool?: { max?: number };
    }>('database');

    super({
      datasources: {
        db: {
          url: databaseConfig?.url ?? (process.env.DATABASE_URL as string),
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    this.maxReconnectAttempts = databaseConfig?.retry?.attempts ?? 3;
    this.reconnectDelay = databaseConfig?.retry?.delay ?? 1000;

    // イベントリスナーの設定
    this.setupEventListeners();
  }

  async onModuleInit() {
    try {
      await this.connectWithRetry();
      this.logger.log('データベースに正常に接続しました');
    } catch (error) {
      this.logger.error('データベース接続に失敗しました', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('データベース接続を切断しました');
    } catch (error) {
      this.logger.error('データベース切断中にエラーが発生しました', error);
    }
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        await this.$connect();
        this.reconnectAttempts = 0;
        return;
      } catch (error) {
        this.logger.warn(
          `データベース接続試行 ${attempt}/${this.maxReconnectAttempts} 失敗:`,
          error
        );

        if (attempt === this.maxReconnectAttempts) {
          throw new Error(
            `データベース接続に失敗しました（最大試行回数 ${this.maxReconnectAttempts} 回に到達）`
          );
        }

        await this.delay(this.reconnectDelay * attempt); // 指数バックオフ
      }
    }
  }

  private setupEventListeners() {
    // TypeScript の型安全性のため、イベントリスナーの設定を調整
    try {
      (this as unknown as PrismaServiceWithEvents).$on('query', (e: PrismaLogEvent) => {
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(`Query: ${e.query} Params: ${e.params} Duration: ${e.duration}ms`);
        }
      });

      (this as unknown as PrismaServiceWithEvents).$on('error', (e: PrismaErrorEvent) => {
        this.logger.error('Prisma error:', e);
      });

      (this as unknown as PrismaServiceWithEvents).$on('warn', (e: PrismaWarnEvent) => {
        this.logger.warn('Prisma warning:', e);
      });

      (this as unknown as PrismaServiceWithEvents).$on('info', (e: PrismaInfoEvent) => {
        this.logger.log('Prisma info:', e);
      });
    } catch (error) {
      this.logger.warn('イベントリスナーのセットアップに失敗しました:', error);
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: Date; info?: HealthCheckInfo }> {
    try {
      // 簡単なクエリでデータベース接続を確認
      await this.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date(),
        info: {
          reconnectAttempts: this.reconnectAttempts,
          maxConnections: this.configService.get<number>('database.pool.max'),
        },
      };
    } catch (error) {
      this.logger.error('データベースヘルスチェック失敗:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        info: {
          error: error instanceof Error ? error.message : String(error),
          reconnectAttempts: this.reconnectAttempts,
        },
      };
    }
  }

  async getDatabaseMetrics(): Promise<{
    activeConnections?: number;
    idleConnections?: number;
    totalConnections?: number;
  }> {
    try {
      // PostgreSQL の接続統計を取得
      const stats = await this.$queryRaw<
        Array<{
          state: string;
          count: number;
        }>
      >`
        SELECT state, count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `;

      const metrics = {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
      };

      stats.forEach((stat: { state: string; count: number }) => {
        const count = Number(stat.count);
        if (stat.state === 'active') {
          metrics.activeConnections = count;
        } else if (stat.state === 'idle') {
          metrics.idleConnections = count;
        }
        metrics.totalConnections += count;
      });

      return metrics;
    } catch (error) {
      this.logger.warn('データベースメトリクス取得に失敗:', error);
      return {};
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
