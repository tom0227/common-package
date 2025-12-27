import { registerAs } from '@nestjs/config';

/**
 * 共通Auth0設定ファクトリー
 *
 * 各マイクロサービスで同じAuth0設定を使用するための共通ファクトリー
 *
 * @param serviceName - サービス名（オプション、デフォルトのaudienceに使用）
 * @returns ConfigFactoryで使用可能な設定オブジェクト
 *
 * @example
 * ```typescript
 * // app.module.ts または main.ts
 * import { createAuthConfig } from '@ori-packaging/shared-modules';
 *
 * ConfigModule.forRoot({
 *   load: [createAuthConfig()],
 * })
 * ```
 */
export function createAuthConfig(serviceName?: string) {
  return registerAs('auth', () => ({
    domain: process.env.AUTH0_DOMAIN ?? 'localhost',
    // 統一されたaudience（全サービス共通）
    audience: process.env.AUTH0_AUDIENCE ?? 'https://api.ori-packaging.com',
    issuerUrl: process.env.AUTH0_ISSUER_URL ?? 'https://localhost/',
    clientId: process.env.AUTH0_CLIENT_ID ?? 'client-id',
    clientSecret: process.env.AUTH0_CLIENT_SECRET ?? 'client-secret',
    // サービス固有のaudience（必要に応じて使用）
    serviceAudience: serviceName ? `https://api.ori-packaging.com/${serviceName}` : undefined,
  }));
}

/**
 * デフォルトのAuth0設定（サービス名なし）
 */
export default createAuthConfig();
