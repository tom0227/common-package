import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { EnhancedLoggerService } from './enhanced-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: EnhancedLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // GraphQLリクエストの場合はGraphQLコンテキストを取得
    const contextType = context.getType().toString();

    if (contextType === 'graphql') {
      return this.handleGraphQLRequest(context, next);
    }

    return this.handleHttpRequest(context, next);
  }

  private handleGraphQLRequest(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        // GraphQLリクエストのログ（簡易版）
        this.logger.logStructured('log', `GraphQL ${info.fieldName} completed`, { duration });
      }),
      catchError((error: Error) => {
        const duration = Date.now() - startTime;
        this.logger.logStructured('error', `GraphQL ${info.fieldName} failed`, {
          duration,
          error: error.message,
        });
        throw error;
      })
    );
  }

  private handleHttpRequest(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const requestId = this.logger.logRequest(request, {
      handler: context.getHandler().name,
      class: context.getClass().name,
    });

    // レスポンスヘッダーにリクエストIDを追加
    response.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.logResponse(request, response.statusCode, duration, requestId);

        // パフォーマンス監視
        if (duration > 1000) {
          this.logger.logPerformance(
            `${request.method} ${request.url}`,
            duration,
            {
              handler: context.getHandler().name,
              class: context.getClass().name,
            },
            { requestId }
          );
        }
      }),
      catchError((error: Error) => {
        const duration = Date.now() - startTime;
        this.logger.logResponse(request, 500, duration, requestId, {
          error: error.message,
        });

        this.logger.logError(error, request, {
          requestId,
          handler: context.getHandler().name,
          class: context.getClass().name,
        });

        throw error;
      })
    );
  }
}
