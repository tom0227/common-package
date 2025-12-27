import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * トークンキャッシュ情報
 */
interface TokenCache {
  token: string;
  expiresAt: number; // Unix timestamp (ミリ秒)
}

@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);
  private readonly managementApi: AxiosInstance;

  /**
   * Management APIトークンのキャッシュ
   * メモリ内に保存し、有効期限が切れるまで再利用
   */
  private tokenCache: TokenCache | null = null;

  /**
   * トークン有効期限のバッファ時間（ミリ秒）
   * トークンが実際に失効する5分前を期限とみなす
   */
  private readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5分

  constructor(private readonly configService: ConfigService) {
    this.managementApi = axios.create({
      baseURL: `https://${this.configService.get<string>('auth.domain')}/api/v2/`,
      timeout: 10000,
    });
  }

  /**
   * Management APIトークンを取得
   * キャッシュされたトークンが有効な場合はそれを返し、
   * 期限切れの場合のみ新しいトークンを取得する
   */
  async getManagementApiToken(): Promise<string> {
    // キャッシュが存在し、まだ有効な場合はキャッシュを返す
    if (this.tokenCache && this.isTokenValid(this.tokenCache)) {
      this.logger.debug('Using cached Management API token');
      return this.tokenCache.token;
    }

    // キャッシュが無効または存在しない場合、新しいトークンを取得
    this.logger.debug('Fetching new Management API token');
    const response = await axios.post<{ access_token: string; expires_in: number }>(
      `https://${this.configService.get<string>('auth.domain')}/oauth/token`,
      {
        client_id: this.configService.get<string>('auth.clientId'),
        client_secret: this.configService.get<string>('auth.clientSecret'),
        audience: `https://${this.configService.get<string>('auth.domain')}/api/v2/`,
        grant_type: 'client_credentials',
      }
    );

    const { access_token, expires_in } = response.data;

    // トークンをキャッシュに保存
    // expires_in は秒単位なので、ミリ秒に変換してバッファを引く
    const expiresAt = Date.now() + expires_in * 1000 - this.TOKEN_EXPIRY_BUFFER_MS;
    this.tokenCache = {
      token: access_token,
      expiresAt,
    };

    this.logger.log(
      `Management API token cached. Expires at: ${new Date(expiresAt).toISOString()}`
    );
    return access_token;
  }

  /**
   * キャッシュされたトークンがまだ有効かどうかをチェック
   * @private
   */
  private isTokenValid(cache: TokenCache): boolean {
    return Date.now() < cache.expiresAt;
  }

  async getUserById(auth0UserId: string) {
    const token = await this.getManagementApiToken();

    const response = await this.managementApi.get(`users/${encodeURIComponent(auth0UserId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }

  async updateUser(
    auth0UserId: string,
    userData: {
      name?: string;
      nickname?: string;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
    }
  ) {
    const token = await this.getManagementApiToken();

    const response = await this.managementApi.patch(
      `users/${encodeURIComponent(auth0UserId)}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async assignRolesToUser(auth0UserId: string, roleIds: string[]) {
    const token = await this.getManagementApiToken();

    await this.managementApi.post(
      `users/${encodeURIComponent(auth0UserId)}/roles`,
      { roles: roleIds },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async removeRolesFromUser(auth0UserId: string, roleIds: string[]) {
    const token = await this.getManagementApiToken();

    await this.managementApi.delete(`users/${encodeURIComponent(auth0UserId)}/roles`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: { roles: roleIds },
    });
  }
}
