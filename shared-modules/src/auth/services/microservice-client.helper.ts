/**
 * Apollo Clientのコンテキスト型
 */
export interface ApolloContext {
  headers?: {
    Authorization?: string;
    [key: string]: string | undefined;
  };
  [key: string]: unknown;
}

/**
 * GraphQLエラー型
 */
export interface GraphQLError {
  message: string;
  [key: string]: unknown;
}

/**
 * GraphQLレスポンス型
 */
export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * マイクロサービス間通信用のヘルパークラス
 *
 * 他のマイクロサービスにGraphQLリクエストを送る際の認証ヘッダー伝播をサポート
 */
export class MicroserviceClientHelper {
  /**
   * 認証ヘッダー付きでfetchリクエストを送信
   *
   * @param url - リクエスト先URL
   * @param query - GraphQLクエリ文字列
   * @param variables - GraphQLクエリ変数
   * @param authToken - 認証トークン（"Bearer "プレフィックスなし）
   * @returns レスポンスのPromise
   *
   * @example
   * ```typescript
   * const response = await MicroserviceClientHelper.fetchWithAuth(
   *   'http://account-service:5001/graphql',
   *   'query { user(id: $id) { name } }',
   *   { id: '123' },
   *   authToken
   * );
   * ```
   */
  static async fetchWithAuth<T = unknown>(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
    authToken?: string
  ): Promise<GraphQLResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      // "Bearer "プレフィックスがない場合は追加
      headers.Authorization = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Microservice request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as GraphQLResponse<T>;
  }

  /**
   * Apollo Clientのコンテキストに認証ヘッダーを設定
   *
   * @param authToken - 認証トークン（"Bearer "プレフィックスなし）
   * @returns Apollo Clientのcontext設定オブジェクト
   *
   * @example
   * ```typescript
   * const result = await apolloClient.mutate({
   *   mutation: ADD_POINTS,
   *   variables: { input },
   *   context: MicroserviceClientHelper.buildApolloContext(authToken),
   * });
   * ```
   */
  static buildApolloContext(authToken?: string): ApolloContext {
    if (!authToken) {
      return {};
    }

    return {
      headers: {
        Authorization: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
      },
    };
  }

  /**
   * エラーレスポンスから詳細なエラーメッセージを抽出
   *
   * @param response - GraphQLレスポンス
   * @returns エラーメッセージ、エラーがない場合はnull
   */
  static extractErrorMessage<T = unknown>(response: GraphQLResponse<T>): string | null {
    if (!response.errors || response.errors.length === 0) {
      return null;
    }

    return response.errors.map((error) => error.message || 'Unknown error').join(', ');
  }
}
