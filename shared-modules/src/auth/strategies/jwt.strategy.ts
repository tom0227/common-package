import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

export interface JwtPayload {
  sub: string; // Auth0 User ID or Client ID
  email?: string;
  scope?: string;
  gty?: string; // Grant type (client-credentials for M2M)
  aud: string | string[];
  iss: string;
  azp?: string; // Authorized party
  [key: string]: unknown; // カスタムクレーム用のインデックスシグネチャ
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly namespace: string;
  private readonly expectedAudience: string[];
  private readonly expectedIssuer: string;

  constructor(private readonly _configService: ConfigService) {
    const issuerUrl =
      _configService.get<string>('auth.issuerUrl') || 'https://dev-zl5tsonlgn2d1ahp.us.auth0.com/';
    const audience = _configService.get<string>('auth.audience') || 'https://api.ori-packaging.com';

    const audienceArray = [audience, `${issuerUrl}userinfo`];

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // トークンに複数のaudienceが含まれる場合があるため、配列として渡す
      // passport-jwtは配列の場合、いずれか1つが一致すればOKとする
      audience: audienceArray,
      issuer: issuerUrl,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuerUrl}.well-known/jwks.json`,
      }),
    });

    // カスタムクレームの名前空間を環境変数から取得（デフォルトあり）
    this.namespace =
      _configService.get<string>('AUTH0_NAMESPACE') || 'https://api.ori-packaging.com';

    // デバッグ用に設定値を保存
    this.expectedAudience = audienceArray;
    this.expectedIssuer = issuerUrl;

    this.logger.log('JWT Strategy initialized with:');
    this.logger.log(`  Expected Audience: ${JSON.stringify(this.expectedAudience)}`);
    this.logger.log(`  Expected Issuer: ${this.expectedIssuer}`);
    this.logger.log(`  JWKS URI: ${issuerUrl}.well-known/jwks.json`);
    this.logger.log(`  Namespace: ${this.namespace}`);
  }

  async validate(payload: JwtPayload) {
    try {
      // JWT検証成功時のログ
      this.logger.debug('JWT token validated successfully');
      this.logger.debug(`  Token Subject (sub): ${payload.sub}`);
      this.logger.debug(`  Token Audience (aud): ${JSON.stringify(payload.aud)}`);
      this.logger.debug(`  Token Issuer (iss): ${payload.iss}`);

      // audience/issuerの検証確認ログ
      const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      const hasMatchingAudience = this.expectedAudience.some((expected) =>
        tokenAudiences.includes(expected)
      );

      if (!hasMatchingAudience) {
        this.logger.warn('⚠️  Audience mismatch detected:');
        this.logger.warn(`  Expected: ${JSON.stringify(this.expectedAudience)}`);
        this.logger.warn(`  Received: ${JSON.stringify(tokenAudiences)}`);
      }

      if (payload.iss !== this.expectedIssuer) {
        this.logger.warn('⚠️  Issuer mismatch detected:');
        this.logger.warn(`  Expected: ${this.expectedIssuer}`);
        this.logger.warn(`  Received: ${payload.iss}`);
      }

      // Machine-to-Machine アプリケーションの場合
      if (payload.gty === 'client-credentials') {
        const scopes = payload.scope?.split(' ') ?? [];

        // スコープベースでロールを決定
        const roles: string[] = [];
        if (scopes.includes('write:users') || scopes.includes('read:users')) {
          roles.push('admin'); // M2Mアプリケーションは管理者権限
        }

        this.logger.log(`M2M authentication successful for client: ${payload.sub}`);

        return {
          auth0UserId: payload.sub,
          userUuid: undefined, // M2Mアプリケーションにはuser UUIDなし
          email: payload.email,
          roles: roles,
          managedUsers: [],
          scopes: scopes,
          isM2M: true,
        };
      }

      // 通常のユーザーログインの場合
      // メール情報を複数のソースから取得を試行
      const emailClaim = `${this.namespace}/email`;
      const rolesClaim = `${this.namespace}/roles`;
      const managedUsersClaim = `${this.namespace}/managed_users`;
      const userIdClaim = `${this.namespace}/user_id`; // user_uuid → user_id に変更

      const emailFromCustomClaim = this.getStringClaim(payload[emailClaim]);
      const email = payload.email ?? emailFromCustomClaim ?? null;
      const roles = this.getStringArrayClaim(payload[rolesClaim]);
      const userId = this.getStringClaim(payload[userIdClaim]); // user_id クレームから取得

      // デバッグログ: ロール取得の確認
      this.logger.debug('[JwtStrategy] User login validation:', {
        auth0UserId: payload.sub,
        userId: userId,
        userIdClaim: userIdClaim,
        userIdFromPayload: payload[userIdClaim],
        email: email,
        rolesClaim: rolesClaim,
        rolesFromPayload: payload[rolesClaim],
        roles: roles,
        namespace: this.namespace,
        fullPayload: payload,
      });

      // user_idが存在しない場合は警告
      if (!userId) {
        this.logger.warn(
          `⚠️  User ID not found in JWT for ${email} (${payload.sub}). Expected claim: ${userIdClaim}`
        );
        this.logger.warn(`   Available claims: ${Object.keys(payload).join(', ')}`);
      }

      this.logger.log(
        `User authentication successful: ${email} (${payload.sub})${
          userId ? ` [User ID: ${userId}]` : ''
        }`
      );

      return {
        auth0UserId: payload.sub,
        userId: userId,
        email: email,
        roles: roles,
        managedUsers: this.getStringArrayClaim(payload[managedUsersClaim]),
        isM2M: false,
      };
    } catch (error: unknown) {
      const errorDetails = error instanceof Error ? error : new Error(String(error));
      this.logger.error('❌ JWT validation error in validate() method:');
      this.logger.error(`  Error: ${errorDetails.message || 'Unknown error'}`);
      this.logger.error(`  Stack: ${errorDetails.stack || 'No stack trace'}`);
      throw errorDetails;
    }
  }

  private getStringClaim(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private getStringArrayClaim(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((entry) => String(entry));
  }
}
