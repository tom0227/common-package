import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

/**
 * passport-jwtからの認証情報
 */
interface AuthInfo {
  message?: string;
  [key: string]: unknown;
}

type ExtendedRequest = Request & {
  logIn?: Request['logIn'];
  logOut?: Request['logOut'];
  user?: Express.User;
};

/**
 * JWT認証ガード
 * HTTPとGraphQLの両方に対応
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * JWT認証の結果をハンドリング
   * エラー時に詳細なログを出力
   */
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | undefined,
    info: AuthInfo | undefined,
    context: ExecutionContext
  ): TUser {
    if (err || !user) {
      const request = this.getRequest(context);
      const rawAuthHeader = request?.headers?.authorization;
      const authHeader =
        (Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader) ?? 'MISSING';

      this.logger.error('❌ JWT Authentication Failed');
      this.logger.error(`  Request URL: ${request?.url ?? 'N/A'}`);
      this.logger.error(`  Request Method: ${request?.method ?? 'N/A'}`);
      this.logger.error(
        `  Authorization Header: ${
          authHeader !== 'MISSING' ? `${authHeader.substring(0, 50)}...` : 'MISSING'
        }`
      );

      if (err) {
        const errorDetails = err instanceof Error ? err : undefined;
        this.logger.error(`  Error Type: ${errorDetails?.name ?? 'Unknown'}`);
        this.logger.error(`  Error Message: ${errorDetails?.message ?? String(err)}`);
      }

      if (info) {
        this.logger.error(`  Info: ${JSON.stringify(info)}`);

        const message = info.message;
        if (message === 'No auth token') {
          this.logger.error('  → Authorizationヘッダーが存在しないか、Bearer形式ではありません');
        } else if (message === 'jwt expired') {
          this.logger.error('  → JWTトークンの有効期限が切れています');
        } else if (message === 'jwt malformed') {
          this.logger.error('  → JWTトークンの形式が不正です');
        } else if (message?.includes('audience')) {
          this.logger.error('  → トークンのaudienceが期待値と一致しません');
        } else if (message?.includes('issuer')) {
          this.logger.error('  → トークンのissuerが期待値と一致しません');
        } else if (message?.includes('signature')) {
          this.logger.error(
            '  → トークンの署名検証に失敗しました（JWKS取得失敗または公開鍵不一致）'
          );
        }
      }

      if (!user) {
        this.logger.error('  → ユーザー情報を取得できませんでした（JWT検証失敗）');
      }

      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }

  /**
   * GraphQLリクエストからHTTPリクエストオブジェクトを取得
   */
  getRequest(context: ExecutionContext): ExtendedRequest | undefined {
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();
      const request = (ctx.req ?? ctx.request) as ExtendedRequest | undefined;

      if (request) {
        this.attachPassportHelpers(request);
      }
      return request;
    }

    return context.switchToHttp().getRequest<ExtendedRequest>();
  }

  private attachPassportHelpers(request: ExtendedRequest) {
    if (!request.logIn) {
      request.logIn = ((
        user: Express.User,
        optionsOrCallback?: unknown,
        maybeCallback?: unknown
      ) => {
        request.user = user;
        const callback =
          typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
        if (typeof callback === 'function') {
          callback();
        }
      }) as ExtendedRequest['logIn'];
    }
    if (!request.logOut) {
      request.logOut = ((optionsOrCallback?: unknown, maybeCallback?: unknown) => {
        request.user = undefined;
        const callback =
          typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
        if (typeof callback === 'function') {
          callback();
        }
      }) as ExtendedRequest['logOut'];
    }
  }
}
