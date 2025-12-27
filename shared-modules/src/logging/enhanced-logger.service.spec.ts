import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EnhancedLoggerService, LogContext } from './enhanced-logger.service';
import { Request } from 'express';

describe('EnhancedLoggerService', () => {
  let service: EnhancedLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnhancedLoggerService],
    }).compile();

    service = module.get<EnhancedLoggerService>(EnhancedLoggerService);
  });

  describe('constructor', () => {
    it('サービス名とバージョンが設定される', () => {
      expect(service).toBeDefined();
      expect(service['serviceName']).toBeDefined();
      expect(service['serviceVersion']).toBeDefined();
    });
  });

  describe('logStructured', () => {
    it('構造化ログを正しく出力する', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const context: LogContext = {
        requestId: 'test-request-id',
        userId: 'test-user-id',
      };

      service.logStructured('log', 'テストメッセージ', context);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('機密情報をマスクする', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const context: LogContext = {
        password: 'secret123',
        token: 'jwt-token-here',
        authorization: 'Bearer token',
      };

      service.logStructured('log', 'テストメッセージ', context);

      // マスクされたデータが含まれることを確認
      const loggedData = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(loggedData.context.password).toBe('***MASKED***');
      expect(loggedData.context.token).toBe('***MASKED***');
      expect(loggedData.context.authorization).toBe('***MASKED***');

      logSpy.mockRestore();
    });
  });

  describe('logRequest', () => {
    it('HTTPリクエストログを正しく出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        headers: {
          'user-agent': 'test-agent',
          'x-correlation-id': 'test-correlation-id',
        },
        connection: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const requestId = service.logRequest(mockRequest);

      expect(requestId).toMatch(/^req_/);
      expect(logStructuredSpy).toHaveBeenCalledWith(
        'log',
        'HTTPリクエスト開始',
        expect.objectContaining({
          requestId,
          method: 'GET',
          url: '/api/test',
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          correlationId: 'test-correlation-id',
        })
      );

      logStructuredSpy.mockRestore();
    });

    it('correlation-idがない場合はUUIDを生成する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();
      const mockRequest = {
        method: 'POST',
        url: '/api/create',
        headers: { 'user-agent': 'test-agent' },
        connection: { remoteAddress: '192.168.1.1' },
      } as unknown as Request;

      service.logRequest(mockRequest);

      const loggedContext = logStructuredSpy.mock.calls[0][2];
      expect((loggedContext as Record<string, unknown>).correlationId).toMatch(/^[0-9a-f-]{36}$/);

      logStructuredSpy.mockRestore();
    });
  });

  describe('logResponse', () => {
    it('HTTPレスポンスログを正しく出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        headers: { 'user-agent': 'test-agent' },
        connection: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      service.logResponse(mockRequest, 200, 150, 'req_12345');

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'log',
        'HTTPリクエスト完了',
        expect.objectContaining({
          requestId: 'req_12345',
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          duration: 150,
        })
      );

      logStructuredSpy.mockRestore();
    });

    it('エラーステータスの場合は適切なログレベルを使用する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();
      const mockRequest = {
        method: 'GET',
        url: '/api/error',
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      // 4xxエラー
      service.logResponse(mockRequest, 404, 50);
      expect(logStructuredSpy).toHaveBeenCalledWith(
        'warn',
        'HTTPリクエスト完了',
        expect.any(Object)
      );

      // 5xxエラー
      service.logResponse(mockRequest, 500, 100);
      expect(logStructuredSpy).toHaveBeenCalledWith(
        'error',
        'HTTPリクエスト完了',
        expect.any(Object)
      );

      logStructuredSpy.mockRestore();
    });
  });

  describe('logDatabaseOperation', () => {
    it('データベース操作ログを正しく出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();

      service.logDatabaseOperation('SELECT', 'users', 25, true);

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'debug',
        'データベース操作: SELECT on users',
        expect.objectContaining({
          operation: 'SELECT',
          tableName: 'users',
          duration: 25,
          success: true,
        })
      );

      logStructuredSpy.mockRestore();
    });

    it('失敗時はエラーレベルでログを出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();

      service.logDatabaseOperation('UPDATE', 'posts', 100, false);

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'error',
        'データベース操作: UPDATE on posts',
        expect.objectContaining({
          operation: 'UPDATE',
          tableName: 'posts',
          duration: 100,
          success: false,
        })
      );

      logStructuredSpy.mockRestore();
    });
  });

  describe('logSecurityEvent', () => {
    it('セキュリティイベントログを正しく出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();

      service.logSecurityEvent('LOGIN_ATTEMPT', 'medium');

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'warn',
        'セキュリティイベント: LOGIN_ATTEMPT',
        expect.objectContaining({
          event: 'LOGIN_ATTEMPT',
          severity: 'medium',
        })
      );

      logStructuredSpy.mockRestore();
    });

    it('重大度に応じて適切なログレベルを使用する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();

      // 高重要度
      service.logSecurityEvent('UNAUTHORIZED_ACCESS', 'critical');
      expect(logStructuredSpy).toHaveBeenCalledWith(
        'error',
        'セキュリティイベント: UNAUTHORIZED_ACCESS',
        expect.any(Object)
      );

      // 低重要度
      service.logSecurityEvent('RATE_LIMIT_WARNING', 'low');
      expect(logStructuredSpy).toHaveBeenCalledWith(
        'warn',
        'セキュリティイベント: RATE_LIMIT_WARNING',
        expect.any(Object)
      );

      logStructuredSpy.mockRestore();
    });
  });

  describe('logPerformance', () => {
    it('パフォーマンスログを正しく出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();

      service.logPerformance('database-query', 500, { query: 'SELECT * FROM users' });

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'debug',
        'パフォーマンス: database-query',
        expect.objectContaining({
          operation: 'database-query',
          duration: 500,
          performanceMetadata: { query: 'SELECT * FROM users' },
        })
      );

      logStructuredSpy.mockRestore();
    });

    it('閾値を超えた場合は警告レベルでログを出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();
      // 環境変数をモック（デフォルト1000ms）
      const originalEnv = process.env.PERFORMANCE_THRESHOLD_MS;
      process.env.PERFORMANCE_THRESHOLD_MS = '800';

      service.logPerformance('slow-operation', 1500);

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'warn',
        'パフォーマンス: slow-operation',
        expect.objectContaining({
          operation: 'slow-operation',
          duration: 1500,
        })
      );

      // 環境変数を復元
      process.env.PERFORMANCE_THRESHOLD_MS = originalEnv;
      logStructuredSpy.mockRestore();
    });
  });

  describe('logError', () => {
    it('エラーログを正しく出力する', () => {
      const logStructuredSpy = jest.spyOn(service, 'logStructured').mockImplementation();
      const error = new Error('テストエラー');
      const mockRequest = {
        method: 'POST',
        url: '/api/error',
        headers: { 'user-agent': 'test-agent' },
        connection: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      service.logError(error, mockRequest, { requestId: 'req_error' });

      expect(logStructuredSpy).toHaveBeenCalledWith(
        'error',
        'エラー発生: テストエラー',
        expect.objectContaining({
          errorName: 'Error',
          errorMessage: 'テストエラー',
          method: 'POST',
          url: '/api/error',
          requestId: 'req_error',
        }),
        error.stack
      );

      logStructuredSpy.mockRestore();
    });
  });

  describe('getClientIp', () => {
    it('X-Forwarded-ForヘッダーからクライアントIPを取得する', () => {
      const mockRequest = {
        headers: { 'x-forwarded-for': '203.0.113.1,198.51.100.1' },
        connection: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const ip = service['getClientIp'](mockRequest);
      expect(ip).toBe('203.0.113.1');
    });

    it('X-Forwarded-Forがない場合はconnection.remoteAddressを使用', () => {
      const mockRequest = {
        headers: {},
        connection: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const ip = service['getClientIp'](mockRequest);
      expect(ip).toBe('192.168.1.100');
    });

    it('IPが取得できない場合は"unknown"を返す', () => {
      const mockRequest = {
        headers: {},
        connection: {},
        socket: {},
      } as unknown as Request;

      const ip = service['getClientIp'](mockRequest);
      expect(ip).toBe('unknown');
    });
  });
});
