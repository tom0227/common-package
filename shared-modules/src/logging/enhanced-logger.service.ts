import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { Request } from 'express';
import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  userId?: string;
  correlationId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

@Injectable()
export class EnhancedLoggerService extends Logger {
  private readonly serviceName: string;
  private readonly serviceVersion: string;

  constructor(context?: string) {
    super(context ?? 'EnhancedLogger');
    this.serviceName = process.env.SERVICE_NAME ?? 'account-service';
    this.serviceVersion = process.env.SERVICE_VERSION ?? '1.0.0';
  }

  /**
   * 構造化ログを出力する
   */
  logStructured(level: LogLevel, message: string, context?: LogContext, stack?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      version: this.serviceVersion,
      context: context ?? {},
      ...(stack && { stack }),
    };

    // 機密情報をマスク
    const sanitizedEntry = this.sanitizeLogEntry(logEntry);

    switch (level) {
      case 'error':
        super.error(JSON.stringify(sanitizedEntry));
        break;
      case 'warn':
        super.warn(JSON.stringify(sanitizedEntry));
        break;
      case 'log':
        super.log(JSON.stringify(sanitizedEntry));
        break;
      case 'debug':
        super.debug(JSON.stringify(sanitizedEntry));
        break;
      case 'verbose':
        super.verbose(JSON.stringify(sanitizedEntry));
        break;
      default:
        super.log(JSON.stringify(sanitizedEntry));
    }
  }

  /**
   * HTTPリクエスト用のログ
   */
  logRequest(request: Request, context?: Partial<LogContext>) {
    const requestId = this.generateRequestId();
    const logContext: LogContext = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      correlationId: (request.headers['x-correlation-id'] as string) || randomUUID(),
      ...context,
    };

    this.logStructured('log', 'HTTPリクエスト開始', logContext);
    return requestId;
  }

  /**
   * HTTPレスポンス用のログ
   */
  logResponse(
    request: Request,
    statusCode: number,
    duration: number,
    requestId?: string,
    context?: Partial<LogContext>
  ) {
    const logContext: LogContext = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      ...context,
    };

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
    this.logStructured(level, 'HTTPリクエスト完了', logContext);
  }

  /**
   * データベース操作用のログ
   */
  logDatabaseOperation(
    operation: string,
    tableName: string,
    duration: number,
    success: boolean,
    context?: Partial<LogContext>
  ) {
    const logContext: LogContext = {
      operation,
      tableName,
      duration,
      success,
      ...context,
    };

    const message = `データベース操作: ${operation} on ${tableName}`;
    const level = success ? 'debug' : 'error';
    this.logStructured(level, message, logContext);
  }

  /**
   * セキュリティイベント用のログ
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    request?: Request,
    context?: Partial<LogContext>
  ) {
    const logContext: LogContext = {
      event,
      severity,
      ...(request && {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: this.getClientIp(request),
      }),
      ...context,
    };

    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logStructured(level, `セキュリティイベント: ${event}`, logContext);
  }

  /**
   * ビジネスロジック用のログ
   */
  logBusinessEvent(event: string, entity: string, entityId: string, context?: Partial<LogContext>) {
    const logContext: LogContext = {
      event,
      entity,
      entityId,
      ...context,
    };

    this.logStructured('log', `ビジネスイベント: ${event}`, logContext);
  }

  /**
   * パフォーマンス用のログ
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
    context?: Partial<LogContext>
  ) {
    const logContext: LogContext = {
      operation,
      duration,
      performanceMetadata: metadata,
      ...context,
    };

    // 閾値を超えた場合は警告
    const threshold = parseInt(process.env.PERFORMANCE_THRESHOLD_MS ?? '1000', 10);
    const level = duration > threshold ? 'warn' : 'debug';

    this.logStructured(level, `パフォーマンス: ${operation}`, logContext);
  }

  /**
   * エラー用の詳細ログ
   */
  logError(error: Error, request?: Request, context?: Partial<LogContext>) {
    const logContext: LogContext = {
      errorName: error.name,
      errorMessage: error.message,
      ...(request && {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: this.getClientIp(request),
      }),
      ...context,
    };

    this.logStructured('error', `エラー発生: ${error.message}`, logContext, error.stack);
  }

  private generateRequestId(): string {
    return `req_${randomUUID().substring(0, 8)}`;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ??
      request.connection?.remoteAddress ??
      (request.socket?.remoteAddress || 'unknown')
    );
  }

  private sanitizeLogEntry(entry: unknown): unknown {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'auth',
      'credentials',
    ];

    const sanitize = (obj: unknown): unknown => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          result[key] = '***MASKED***';
        } else if (typeof value === 'object') {
          result[key] = sanitize(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitize(entry);
  }
}
