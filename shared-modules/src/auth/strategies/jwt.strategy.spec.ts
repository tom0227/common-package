import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);

    // デフォルト設定
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'auth.audience':
          return 'test-audience';
        case 'auth.issuerUrl':
          return 'https://test.auth0.com/';
        default:
          return undefined;
      }
    });
  });

  describe('validate', () => {
    it('M2Mアプリケーションのトークンを検証する（write権限あり）', async () => {
      const payload: JwtPayload = {
        sub: 'client123@clients',
        scope: 'read:users write:users',
        gty: 'client-credentials',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'client123@clients',
        userUuid: undefined,
        email: undefined,
        roles: ['admin'],
        managedUsers: [],
        scopes: ['read:users', 'write:users'],
        isM2M: true,
      });
    });

    it('M2Mアプリケーションのトークンを検証する（read権限のみ）', async () => {
      const payload: JwtPayload = {
        sub: 'client456@clients',
        scope: 'read:users',
        gty: 'client-credentials',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'client456@clients',
        userUuid: undefined,
        email: undefined,
        roles: ['admin'],
        managedUsers: [],
        scopes: ['read:users'],
        isM2M: true,
      });
    });

    it('M2Mアプリケーションのトークンを検証する（権限なし）', async () => {
      const payload: JwtPayload = {
        sub: 'client789@clients',
        scope: 'some:other:scope',
        gty: 'client-credentials',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'client789@clients',
        userUuid: undefined,
        email: undefined,
        roles: [],
        managedUsers: [],
        scopes: ['some:other:scope'],
        isM2M: true,
      });
    });

    it('M2Mアプリケーションのトークンでスコープが未定義の場合', async () => {
      const payload: JwtPayload = {
        sub: 'client999@clients',
        gty: 'client-credentials',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'client999@clients',
        userUuid: undefined,
        email: undefined,
        roles: [],
        managedUsers: [],
        scopes: [],
        isM2M: true,
      });
    });

    it('通常のユーザーログインを検証する', async () => {
      const payload: JwtPayload = {
        sub: 'auth0|user123',
        email: 'user@example.com',
        'https://api.ori-packaging.com/roles': ['user', 'admin'],
        'https://api.ori-packaging.com/managed_users': ['user456', 'user789'],
        'https://api.ori-packaging.com/user_id': 'auth0|user123',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'auth0|user123',
        userId: 'auth0|user123',
        email: 'user@example.com',
        roles: ['user', 'admin'],
        managedUsers: ['user456', 'user789'],
        isM2M: false,
      });
    });

    it('通常のユーザーログインでカスタムクレームが未定義の場合', async () => {
      const payload: JwtPayload = {
        sub: 'auth0|user456',
        email: 'user2@example.com',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'auth0|user456',
        userId: undefined,
        email: 'user2@example.com',
        roles: [],
        managedUsers: [],
        isM2M: false,
      });
    });

    it('通常のユーザーログインでEmailが未定義の場合', async () => {
      const payload: JwtPayload = {
        sub: 'auth0|user789',
        'https://api.ori-packaging.com/roles': ['user'],
        'https://api.ori-packaging.com/user_id': 'auth0|user789',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        auth0UserId: 'auth0|user789',
        userId: 'auth0|user789',
        email: null,
        roles: ['user'],
        managedUsers: [],
        isM2M: false,
      });
    });

    it('M2Mトークンでスコープ文字列を正しく分割する', async () => {
      const payload: JwtPayload = {
        sub: 'client123@clients',
        scope: 'read:users write:users admin:all',
        gty: 'client-credentials',
        aud: 'test-audience',
        iss: 'https://test.auth0.com/',
      };

      const result = await strategy.validate(payload);

      expect(result.scopes).toEqual(['read:users', 'write:users', 'admin:all']);
    });
  });
});
