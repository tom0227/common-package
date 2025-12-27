import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Auth0Service } from './auth0.service';
import axios, { AxiosInstance } from 'axios';

// axiosをモック
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth0Service', () => {
  let service: Auth0Service;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    // axios.create のモック
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      defaults: { headers: {} },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as unknown as jest.Mocked<AxiosInstance>;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Auth0Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<Auth0Service>(Auth0Service);
    configService = module.get(ConfigService);

    // デフォルト設定
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'auth.domain':
          return 'test.auth0.com';
        case 'auth.clientId':
          return 'test-client-id';
        case 'auth.clientSecret':
          return 'test-client-secret';
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getManagementApiToken', () => {
    it('Management API トークンを取得する', async () => {
      const mockResponse = {
        data: {
          access_token: 'management-api-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getManagementApiToken();

      expect(result).toBe('management-api-token');
      expect(mockedAxios.post).toHaveBeenCalledWith('https://test.auth0.com/oauth/token', {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        audience: 'https://test.auth0.com/api/v2/',
        grant_type: 'client_credentials',
      });
    });

    it('トークン取得に失敗した場合はエラーをスロー', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Unauthorized'));

      await expect(service.getManagementApiToken()).rejects.toThrow('Unauthorized');
    });

    describe('トークンキャッシング', () => {
      beforeEach(() => {
        // 各テストの前にキャッシュをクリア
        service['tokenCache'] = null;
      });

      it('有効なトークンがキャッシュされている場合は再利用する', async () => {
        const mockResponse = {
          data: {
            access_token: 'cached-token',
            expires_in: 3600, // 1時間
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        // 1回目: トークンを取得してキャッシュに保存
        const firstToken = await service.getManagementApiToken();
        expect(firstToken).toBe('cached-token');
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        // 2回目: キャッシュから取得（Auth0 APIは呼ばれない）
        const secondToken = await service.getManagementApiToken();
        expect(secondToken).toBe('cached-token');
        expect(mockedAxios.post).toHaveBeenCalledTimes(1); // 変化なし
      });

      it('キャッシュが期限切れの場合は新しいトークンを取得する', async () => {
        const firstMockResponse = {
          data: {
            access_token: 'first-token',
            expires_in: 0, // すぐに期限切れ
          },
        };

        const secondMockResponse = {
          data: {
            access_token: 'second-token',
            expires_in: 3600,
          },
        };

        mockedAxios.post
          .mockResolvedValueOnce(firstMockResponse)
          .mockResolvedValueOnce(secondMockResponse);

        // 1回目: トークンを取得
        const firstToken = await service.getManagementApiToken();
        expect(firstToken).toBe('first-token');

        // 2回目: 期限切れなので新しいトークンを取得
        const secondToken = await service.getManagementApiToken();
        expect(secondToken).toBe('second-token');
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      });

      it('有効期限の5分前にトークンを更新する', async () => {
        // トークンが5分後に失効する設定
        const mockResponse = {
          data: {
            access_token: 'short-lived-token',
            expires_in: 300, // 5分（バッファ時間と同じ）
          },
        };

        const newMockResponse = {
          data: {
            access_token: 'new-token',
            expires_in: 3600,
          },
        };

        mockedAxios.post
          .mockResolvedValueOnce(mockResponse)
          .mockResolvedValueOnce(newMockResponse);

        // 1回目: トークンを取得
        await service.getManagementApiToken();
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        // 2回目: バッファ時間を考慮すると期限切れなので更新
        await service.getManagementApiToken();
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      });

      it('キャッシュがない状態で初回呼び出しするとトークンを取得する', async () => {
        const mockResponse = {
          data: {
            access_token: 'initial-token',
            expires_in: 3600,
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const token = await service.getManagementApiToken();

        expect(token).toBe('initial-token');
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(service['tokenCache']).not.toBeNull();
        expect(service['tokenCache']?.token).toBe('initial-token');
      });

      it('キャッシュの有効期限が正しく計算される', async () => {
        const now = Date.now();
        const expiresIn = 86400; // 24時間
        const bufferMs = 5 * 60 * 1000; // 5分

        const mockResponse = {
          data: {
            access_token: 'test-token',
            expires_in: expiresIn,
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        await service.getManagementApiToken();

        const cache = service['tokenCache'];
        expect(cache).not.toBeNull();

        // 有効期限が現在時刻 + expires_in - バッファに近いことを確認
        const expectedExpiry = now + (expiresIn * 1000) - bufferMs;
        const actualExpiry = cache!.expiresAt;

        // 100ms の誤差を許容
        expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(100);
      });
    });
  });

  describe('getUserById', () => {
    it('ユーザー情報を取得する', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'management-token',
          expires_in: 3600,
        },
      };

      const mockUserResponse = {
        data: {
          user_id: 'auth0|user123',
          email: 'user@example.com',
          name: 'Test User',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      service['managementApi'].get = jest.fn().mockResolvedValue(mockUserResponse);

      const result = await service.getUserById('auth0|user123');

      expect(result).toEqual({
        user_id: 'auth0|user123',
        email: 'user@example.com',
        name: 'Test User',
      });

      expect(service['managementApi'].get).toHaveBeenCalledWith('users/auth0%7Cuser123', {
        headers: {
          Authorization: 'Bearer management-token',
        },
      });
    });

    it('ユーザーが見つからない場合はエラーをスロー', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'management-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      service['managementApi'].get = jest.fn().mockRejectedValue(new Error('User not found'));

      await expect(service.getUserById('nonexistent-user')).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('ユーザー情報を更新する', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'management-token',
          expires_in: 3600,
        },
      };

      const mockUpdateResponse = {
        data: {
          user_id: 'auth0|user123',
          email: 'user@example.com',
          name: 'Updated Name',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      service['managementApi'].patch = jest.fn().mockResolvedValue(mockUpdateResponse);

      const userData = {
        name: 'Updated Name',
        user_metadata: { preference: 'dark' },
      };

      const result = await service.updateUser('auth0|user123', userData);

      expect(result).toEqual({
        user_id: 'auth0|user123',
        email: 'user@example.com',
        name: 'Updated Name',
      });

      expect(service['managementApi'].patch).toHaveBeenCalledWith(
        'users/auth0%7Cuser123',
        userData,
        {
          headers: {
            Authorization: 'Bearer management-token',
          },
        }
      );
    });
  });

  describe('assignRolesToUser', () => {
    it('ユーザーにロールを割り当てる', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'management-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      service['managementApi'].post = jest.fn().mockResolvedValue({ data: {} });

      await service.assignRolesToUser('auth0|user123', ['role-1', 'role-2']);

      expect(service['managementApi'].post).toHaveBeenCalledWith(
        'users/auth0%7Cuser123/roles',
        { roles: ['role-1', 'role-2'] },
        {
          headers: {
            Authorization: 'Bearer management-token',
          },
        }
      );
    });
  });

  describe('removeRolesFromUser', () => {
    it('ユーザーからロールを削除する', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'management-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      service['managementApi'].delete = jest.fn().mockResolvedValue({ data: {} });

      await service.removeRolesFromUser('auth0|user123', ['role-1', 'role-2']);

      expect(service['managementApi'].delete).toHaveBeenCalledWith('users/auth0%7Cuser123/roles', {
        headers: {
          Authorization: 'Bearer management-token',
        },
        data: { roles: ['role-1', 'role-2'] },
      });
    });
  });

  describe('URL encoding', () => {
    it('ユーザーIDを適切にURLエンコードする', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'management-token',
          expires_in: 3600,
        },
      };

      const mockUserResponse = {
        data: { user_id: 'google-oauth2|123456789' },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      service['managementApi'].get = jest.fn().mockResolvedValue(mockUserResponse);

      await service.getUserById('google-oauth2|123456789');

      expect(service['managementApi'].get).toHaveBeenCalledWith(
        'users/google-oauth2%7C123456789',
        expect.any(Object)
      );
    });
  });
});
