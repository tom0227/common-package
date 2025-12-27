import { PermissionService } from './permission.service';
import { UserRole, Permission, CurrentUserData } from '../types/permission.types';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
  });

  describe('hasPermission', () => {
    it('システム管理者は全権限を持つ', () => {
      const user: CurrentUserData = {
        userId: 'user-1',
        roles: [UserRole.SYSTEM_ADMIN],
        managedUsers: [],
      };

      expect(service.hasPermission(user, Permission.CREATE_USER)).toBe(true);
      expect(service.hasPermission(user, Permission.DELETE_USER)).toBe(true);
      expect(service.hasPermission(user, Permission.MANAGE_SYSTEM)).toBe(true);
    });

    it('管理者は適切な権限を持つ', () => {
      const user: CurrentUserData = {
        userId: 'user-1',
        roles: [UserRole.ADMIN],
        managedUsers: [],
      };

      expect(service.hasPermission(user, Permission.CREATE_USER)).toBe(true);
      expect(service.hasPermission(user, Permission.READ_USER)).toBe(true);
      expect(service.hasPermission(user, Permission.MANAGE_SYSTEM)).toBe(false);
    });

    it('一般ユーザーは限定的な権限のみ持つ', () => {
      const user: CurrentUserData = {
        userId: 'user-1',
        roles: [UserRole.USER],
        managedUsers: [],
      };

      expect(service.hasPermission(user, Permission.READ_PROFILE)).toBe(true);
      expect(service.hasPermission(user, Permission.UPDATE_PROFILE)).toBe(true);
      expect(service.hasPermission(user, Permission.CREATE_USER)).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('システム管理者は全ユーザーを管理できる', () => {
      const user: CurrentUserData = {
        userId: 'admin-1',
        roles: [UserRole.SYSTEM_ADMIN],
        managedUsers: [],
      };

      expect(service.canManageUser(user, 'any-user')).toBe(true);
    });

    it('管理者は管理対象ユーザーのみ管理できる', () => {
      const user: CurrentUserData = {
        userId: 'admin-1',
        roles: [UserRole.ADMIN],
        managedUsers: ['user-1', 'user-2'],
      };

      expect(service.canManageUser(user, 'user-1')).toBe(true);
      expect(service.canManageUser(user, 'user-3')).toBe(false);
    });

    it('ユーザーは自分自身のみ管理できる', () => {
      const user: CurrentUserData = {
        userId: 'user-1',
        roles: [UserRole.USER],
        managedUsers: [],
      };

      expect(service.canManageUser(user, 'user-1')).toBe(true);
      expect(service.canManageUser(user, 'user-2')).toBe(false);
    });
  });

  describe('hasRoleLevel', () => {
    it('ロールレベルを正しく比較する', () => {
      const systemAdmin: CurrentUserData = {
        userId: 'admin-1',
        roles: [UserRole.SYSTEM_ADMIN],
        managedUsers: [],
      };

      const admin: CurrentUserData = {
        userId: 'admin-2',
        roles: [UserRole.ADMIN],
        managedUsers: [],
      };

      const user: CurrentUserData = {
        userId: 'user-1',
        roles: [UserRole.USER],
        managedUsers: [],
      };

      expect(service.hasRoleLevel(systemAdmin, UserRole.USER)).toBe(true);
      expect(service.hasRoleLevel(systemAdmin, UserRole.ADMIN)).toBe(true);
      expect(service.hasRoleLevel(admin, UserRole.USER)).toBe(true);
      expect(service.hasRoleLevel(admin, UserRole.SYSTEM_ADMIN)).toBe(false);
      expect(service.hasRoleLevel(user, UserRole.ADMIN)).toBe(false);
    });
  });
});
