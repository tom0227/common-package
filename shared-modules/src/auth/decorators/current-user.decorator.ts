import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface CurrentUserData {
  auth0UserId: string; // Auth0 User ID (例: "auth0|123456")
  userId?: string; // account-serviceのUser ID（カスタムクレームから取得）
  email?: string;
  roles: string[];
  managedUsers: string[];
  scopes?: string[];
  isM2M?: boolean;
}

/**
 * JWTで検証済みのユーザー情報を抽出するヘルパー関数
 *
 * SECURITY NOTE: このデコレーターは JwtAuthGuard で既に検証済みの
 * request.user を取得するためだけに使用されます。
 * JWT トークンの署名検証なしでペイロードをデコードすることは
 * セキュリティリスクとなるため、行いません。
 */
function extractUserFromToken(request: {
  user?: CurrentUserData;
  headers?: { authorization?: string };
}): CurrentUserData | undefined {
  // JwtAuthGuard で検証済みのユーザー情報のみを返す
  return request.user;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData | undefined => {
    // GraphQLコンテキストの場合
    const contextType = ctx.getType().toString();
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(ctx);
      const context = gqlContext.getContext();
      const request = (context.req || context) as {
        user?: CurrentUserData;
        headers?: { authorization?: string };
      };

      return extractUserFromToken(request);
    }

    // HTTPコンテキストの場合
    const request = ctx.switchToHttp().getRequest() as {
      user?: CurrentUserData;
      headers?: { authorization?: string };
    };

    return extractUserFromToken(request);
  }
);
