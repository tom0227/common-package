import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';
import { UserRole } from '../../rbac/types/permission.types';

describe('Roles decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('単一のロールをメタデータに設定する', () => {
    class TestController {
      @Roles(UserRole.ADMIN)
      adminOnlyMethod() {
        return 'admin only';
      }
    }

    const controller = new TestController();
    const metadata = reflector.get<UserRole[]>('roles', controller.adminOnlyMethod);

    expect(metadata).toEqual([UserRole.ADMIN]);
  });

  it('複数のロールをメタデータに設定する', () => {
    class TestController {
      @Roles(UserRole.ADMIN, UserRole.USER)
      multiRoleMethod() {
        return 'multi role';
      }
    }

    const controller = new TestController();
    const metadata = reflector.get<UserRole[]>('roles', controller.multiRoleMethod);

    expect(metadata).toEqual([UserRole.ADMIN, UserRole.USER]);
  });

  it('クラスレベルでロールを設定する', () => {
    @Roles(UserRole.ADMIN)
    class AdminController {
      method() {
        return 'admin only';
      }
    }

    const metadata = reflector.get<UserRole[]>('roles', AdminController);

    expect(metadata).toEqual([UserRole.ADMIN]);
  });

  it('ロールが設定されていない場合はundefinedを返す', () => {
    class TestController {
      publicMethod() {
        return 'public';
      }
    }

    const controller = new TestController();
    const metadata = reflector.get<UserRole[]>('roles', controller.publicMethod);

    expect(metadata).toBeUndefined();
  });
});
