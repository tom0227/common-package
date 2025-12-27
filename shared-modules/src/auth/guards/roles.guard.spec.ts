import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../rbac/types/permission.types';
import { CurrentUserData } from '../decorators/current-user.decorator';

interface MockRequest {
  user?: CurrentUserData | null;
}

interface MockExecutionContext {
  switchToHttp: () => {
    getRequest: () => MockRequest;
  };
  getHandler: jest.Mock;
  getClass: jest.Mock;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  const createMockContext = (user: CurrentUserData | null = null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('ロールが要求されていない場合はtrueを返す', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('ユーザーが要求されたロールを持っている場合はtrueを返す', () => {
      const requiredRoles = [UserRole.USER];
      const user: CurrentUserData = {
        auth0UserId: 'auth0|abc',
        userId: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER, UserRole.ADMIN],
        managedUsers: [],
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('ユーザーが要求されたロールを持っていない場合は例外をスローする', () => {
      const requiredRoles = [UserRole.ADMIN];
      const user: CurrentUserData = {
        auth0UserId: 'auth0|abc',
        userId: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
        managedUsers: [],
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('必要な権限がありません');
    });

    it('ユーザーが存在しない場合は例外をスローする', () => {
      const requiredRoles = [UserRole.USER];

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('ユーザー情報が見つかりません');
    });

    it('ユーザーにrolesプロパティが存在しない場合は例外をスローする', () => {
      const requiredRoles = [UserRole.USER];
      const user = { auth0UserId: 'auth0|missing' } as CurrentUserData;

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('必要な権限がありません');
    });

    it('複数のロールが要求され、そのうち1つでも持っている場合はtrueを返す', () => {
      const requiredRoles = [UserRole.ADMIN, UserRole.USER];
      const user: CurrentUserData = {
        auth0UserId: 'auth0|abc',
        userId: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER, UserRole.ADMIN],
        managedUsers: [],
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('ユーザー情報が存在するがrolesが空配列の場合は例外をスローする', () => {
      const requiredRoles = [UserRole.ADMIN];
      const user: CurrentUserData = {
        auth0UserId: 'auth0|abc',
        userId: 'user-123',
        email: 'test@example.com',
        roles: [],
        managedUsers: [],
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      const context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('必要な権限がありません');
    });
  });
});
