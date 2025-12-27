/**
 * GraphQLコンテキストの型定義
 */
export interface GraphQLContext {
  req?: {
    headers?: {
      authorization?: string;
      [key: string]: string | string[] | undefined;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * GraphQLコンテキストから認証トークンを抽出するヘルパー
 */
export class GraphQLContextHelper {
  /**
   * GraphQLコンテキストからAuthorizationヘッダーを取得
   *
   * @param context - GraphQLコンテキスト（@Context()デコレーターから取得）
   * @returns Authorizationヘッダー（"Bearer "プレフィックスなし）、見つからない場合はundefined
   *
   * @example
   * ```typescript
   * @Query()
   * async myQuery(@Context() context: GraphQLContext): Promise<void> {
   *   const authToken = GraphQLContextHelper.extractAuthToken(context);
   *   await this.otherService.callWithAuth(authToken);
   * }
   * ```
   */
  static extractAuthToken(context: GraphQLContext): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const authHeader = context?.req?.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return undefined;
    }

    // "Bearer "プレフィックスを削除してトークンのみを返す
    return authHeader.replace(/^Bearer\s+/i, '');
  }

  /**
   * GraphQLコンテキストからAuthorizationヘッダーを取得（プレフィックス付き）
   *
   * @param context - GraphQLコンテキスト（@Context()デコレーターから取得）
   * @returns Authorizationヘッダー（"Bearer "プレフィックス付き）、見つからない場合はundefined
   *
   * @example
   * ```typescript
   * @Query()
   * async myQuery(@Context() context: GraphQLContext): Promise<void> {
   *   const authHeader = GraphQLContextHelper.extractAuthHeader(context);
   *   // fetch APIなどでそのまま使用可能
   * }
   * ```
   */
  static extractAuthHeader(context: GraphQLContext): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const authHeader = context?.req?.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return undefined;
    }

    return authHeader;
  }

  /**
   * 認証トークンからAuthorizationヘッダーを構築
   *
   * @param token - JWTトークン（"Bearer "プレフィックスなし）
   * @returns Authorizationヘッダー（"Bearer "プレフィックス付き）
   *
   * @example
   * ```typescript
   * const token = "eyJhbGc...";
   * const authHeader = GraphQLContextHelper.buildAuthHeader(token);
   * // => "Bearer eyJhbGc..."
   * ```
   */
  static buildAuthHeader(token: string): string {
    // すでに"Bearer "プレフィックスがある場合はそのまま返す
    if (token.startsWith('Bearer ')) {
      return token;
    }

    return `Bearer ${token}`;
  }
}
