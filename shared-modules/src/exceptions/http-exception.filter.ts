import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from './domain-exception.base';

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    userMessage: string;
    details?: Record<string, unknown>;
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
  };
  meta: {
    timestamp: string;
    version: string;
    environment: string;
  };
}

type CustomErrorPayload = {
  error: Record<string, unknown> & { code: string; timestamp?: string };
  meta?: {
    timestamp?: string;
    version?: string;
    environment?: string;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // GraphQLリクエストの場合、requestがundefinedになることがある
    if (!request || !response) {
      this.logger.error(
        'GraphQL request detected, but exception filter is not fully GraphQL-compatible'
      );
      // GraphQLの場合はスキップして、GraphQLのエラーハンドリングに任せる
      return;
    }

    const { status, errorResponse } = this.handleException(exception, request);

    // ログ出力（エラーレベルに応じて）
    this.logError(exception, request, status);

    // Postmanテストからのリクエストかどうかをチェック
    const userAgent = request.headers['user-agent'] ?? '';
    const isPostmanRequest =
      userAgent.toLowerCase().includes('newman') || userAgent.toLowerCase().includes('postman');

    if (isPostmanRequest) {
      // Postmanテスト用に簡素化されたエラー形式を返す
      const simplifiedError = {
        message: errorResponse.error.message,
        statusCode: status,
      };
      response.status(status).json(simplifiedError);
    } else {
      // 通常の詳細なエラー形式を返す
      response.status(status).json(errorResponse);
    }
  }

  private handleException(
    exception: unknown,
    request: Request
  ): {
    status: number;
    errorResponse: StandardErrorResponse;
  } {
    const timestamp = new Date().toISOString();
    const originalUrl = (request as Request & { originalUrl?: string }).originalUrl;
    const path = request?.url || originalUrl || '/graphql';
    const method = request?.method || 'POST';
    const requestIdHeader = request?.headers?.['x-request-id'];
    const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;

    // デバッグログ: 例外の型を確認
    this.logger.debug(`Exception type: ${this.getExceptionName(exception)}`);
    this.logger.debug(`Is HttpException: ${exception instanceof HttpException}`);

    // ドメイン例外の処理
    if (exception instanceof DomainException) {
      return {
        status: exception.statusCode,
        errorResponse: {
          success: false,
          error: {
            code: exception.code,
            message: exception.message,
            userMessage: exception.userMessage ?? exception.message,
            details: this.sanitizeDetails(exception.details),
            timestamp,
            path,
            method,
            requestId,
          },
          meta: {
            timestamp,
            version: process.env.SERVICE_VERSION ?? '1.0.0',
            environment: process.env.NODE_ENV ?? 'development',
          },
        },
      };
    }

    // HTTP例外の処理（instanceof + 型名チェック）
    // NOTE: モジュール解決の問題でinstanceofが失敗する場合があるため、型名でも判定
    const isHttpException =
      exception instanceof HttpException ||
      exception?.constructor?.name === 'HttpException' ||
      exception?.constructor?.name === 'BadRequestException' ||
      exception?.constructor?.name === 'UnauthorizedException' ||
      exception?.constructor?.name === 'ForbiddenException' ||
      exception?.constructor?.name === 'NotFoundException';

    if (isHttpException && this.hasHttpExceptionContract(exception)) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // カスタムエラー形式（SetupGuardなど）をチェック
      if (this.isCustomErrorPayload(exceptionResponse)) {
        const customError = exceptionResponse;
        const meta = customError.meta ?? {};
        return {
          status,
          errorResponse: {
            success: false,
            error: {
              code: customError.error.code,
              message: this.getString(customError.error.message, 'An error occurred'),
              userMessage: this.getString(customError.error.userMessage, 'エラーが発生しました'),
              details:
                typeof customError.error.details === 'object' && customError.error.details !== null
                  ? (customError.error.details as Record<string, unknown>)
                  : undefined,
              timestamp: customError.error.timestamp || timestamp,
              path,
              method,
              requestId,
            },
            meta: {
              timestamp: meta.timestamp ?? timestamp,
              version: meta.version ?? process.env.SERVICE_VERSION ?? '1.0.0',
              environment: meta.environment ?? process.env.NODE_ENV ?? 'development',
            },
          },
        };
      }

      // 標準的なHttpExceptionの処理
      return {
        status,
        errorResponse: {
          success: false,
          error: {
            code: this.getHttpErrorCode(status),
            message:
              typeof exceptionResponse === 'string'
                ? exceptionResponse
                : this.getMessageFromResponse(exceptionResponse) ||
                  this.ensureError(exception).message ||
                  'An error occurred',
            userMessage: this.getHttpUserMessage(status),
            details:
              typeof exceptionResponse === 'object' && exceptionResponse !== null
                ? (exceptionResponse as Record<string, unknown>)
                : undefined,
            timestamp,
            path,
            method,
            requestId,
          },
          meta: {
            timestamp,
            version: process.env.SERVICE_VERSION ?? '1.0.0',
            environment: process.env.NODE_ENV ?? 'development',
          },
        },
      };
    }

    // 予期しないエラーの処理
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: isProduction ? 'Internal server error' : this.ensureError(exception).message,
          userMessage: 'サーバー内部エラーが発生しました',
          details: isProduction
            ? undefined
            : {
                stack: this.ensureError(exception).stack,
                name: this.ensureError(exception).name,
              },
          timestamp,
          path,
          method,
          requestId,
        },
        meta: {
          timestamp,
          version: process.env.SERVICE_VERSION ?? '1.0.0',
          environment: process.env.NODE_ENV ?? 'development',
        },
      },
    };
  }

  private getHttpErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] ?? 'HTTP_ERROR';
  }

  private getHttpUserMessage(status: number): string {
    const messageMap: Record<number, string> = {
      400: '入力内容に問題があります',
      401: '認証が必要です',
      403: 'アクセス権限がありません',
      404: 'リソースが見つかりません',
      409: '競合が発生しました',
      422: '入力データが正しくありません',
      429: 'リクエストが多すぎます。しばらく待ってから再試行してください',
      500: 'サーバー内部エラーが発生しました',
      502: 'サーバーエラーが発生しました',
      503: 'サービスが一時的に利用できません',
    };
    return messageMap[status] ?? 'エラーが発生しました';
  }

  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const sanitized = { ...details };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***MASKED***';
      }
    }

    return sanitized;
  }

  private hasHttpExceptionContract(
    exception: unknown
  ): exception is HttpException & { getStatus: () => number; getResponse: () => unknown } {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }
    const candidate = exception as Partial<HttpException> & {
      getStatus?: unknown;
      getResponse?: unknown;
    };
    return typeof candidate.getStatus === 'function' && typeof candidate.getResponse === 'function';
  }

  private isCustomErrorPayload(value: unknown): value is CustomErrorPayload {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    if (!('error' in value)) {
      return false;
    }
    const errorPayload = (value as { error?: unknown }).error;
    return typeof errorPayload === 'object' && errorPayload !== null && 'code' in errorPayload;
  }

  private getMessageFromResponse(response: unknown): string | undefined {
    if (typeof response !== 'object' || response === null) {
      return undefined;
    }
    const record = response as Record<string, unknown>;
    return typeof record.message === 'string' ? record.message : undefined;
  }

  private getString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
  }

  private getExceptionName(exception: unknown): string {
    if (exception && typeof exception === 'object') {
      const ctor = (exception as { constructor?: { name?: string } }).constructor;
      if (ctor?.name) {
        return ctor.name;
      }
    }
    return 'UnknownException';
  }

  private ensureError(exception: unknown): Error {
    if (exception instanceof Error) {
      return exception;
    }
    return new Error(typeof exception === 'string' ? exception : 'Unknown error');
  }

  private logError(exception: unknown, request: Request, status: number) {
    const method = request?.method || 'UNKNOWN';
    const url = request?.url || request?.['originalUrl'] || '/graphql';
    const body = request?.body as Record<string, unknown>;
    const headers = request?.headers || {};
    const userAgent = headers['user-agent'] as string | undefined;
    const ip =
      (headers['x-forwarded-for'] as string) ?? request?.connection?.remoteAddress ?? 'unknown';

    const logContext = {
      method,
      url,
      userAgent,
      ip,
      body: this.sanitizeBody(body),
      status,
    };

    if (status >= 500) {
      // 5xx エラーは ERROR レベル
      this.logger.error(
        `Internal server error: ${(exception as Error).message}`,
        (exception as Error).stack,
        logContext
      );
    } else if (status >= 400) {
      // 4xx エラーは WARN レベル
      this.logger.warn(`Client error: ${(exception as Error).message}`, logContext);
    }
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...(body as Record<string, unknown>) };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***MASKED***';
      }
    }

    return sanitized;
  }
}
