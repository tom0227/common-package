import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const IS_PUBLIC_KEY = 'isPublic';

interface MockRequest {
  user?: unknown;
}

interface MockExecutionContext {
  getHandler: jest.Mock;
  getClass: jest.Mock;
  switchToHttp: () => {
    getRequest: () => MockRequest;
  };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  const createMockContext = (): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as MockExecutionContext & ExecutionContext;
  };

  describe('canActivate', () => {
    it('パブリックエンドポイントの場合はtrueを返す', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('パブリックでないエンドポイントの場合は親クラスのcanActivateを呼ぶ', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext();

      // 親クラスのcanActivateメソッドをモック化
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
      expect(result).toBe(true);

      superCanActivateSpy.mockRestore();
    });

    it('isPublicがundefinedの場合は親クラスのcanActivateを呼ぶ', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext();

      // 親クラスのcanActivateメソッドをモック化
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
      expect(result).toBe(true);

      superCanActivateSpy.mockRestore();
    });
  });
});
