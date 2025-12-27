import { getPermissionsByRole, getPermissionsByRoles } from './role-permissions.config';
import { UserRole, Permission } from '../types/permission.types';

describe('Role Permissions Config', () => {
  describe('getPermissionsByRole', () => {
    it('システム管理者の権限を正しく取得する', () => {
      const permissions = getPermissionsByRole(UserRole.SYSTEM_ADMIN);

      expect(permissions).toContain(Permission.CREATE_USER);
      expect(permissions).toContain(Permission.DELETE_USER);
      expect(permissions).toContain(Permission.MANAGE_SYSTEM);
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS);
    });

    it('管理者の権限を正しく取得する', () => {
      const permissions = getPermissionsByRole(UserRole.ADMIN);

      expect(permissions).toContain(Permission.CREATE_USER);
      expect(permissions).toContain(Permission.READ_USER);
      expect(permissions).not.toContain(Permission.DELETE_USER);
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM);
    });

    it('一般ユーザーの権限を正しく取得する', () => {
      const permissions = getPermissionsByRole(UserRole.USER);

      expect(permissions).toContain(Permission.READ_PROFILE);
      expect(permissions).toContain(Permission.UPDATE_PROFILE);
      expect(permissions).not.toContain(Permission.CREATE_USER);
      expect(permissions).not.toContain(Permission.DELETE_USER);
    });

    it('不正なロールの場合は空配列を返す', () => {
      const permissions = getPermissionsByRole('invalid_role' as UserRole);
      expect(permissions).toEqual([]);
    });
  });

  describe('getPermissionsByRoles', () => {
    it('複数のロールから権限を統合する', () => {
      const permissions = getPermissionsByRoles([UserRole.USER, UserRole.ADMIN]);

      // USERの権限
      expect(permissions).toContain(Permission.READ_PROFILE);
      expect(permissions).toContain(Permission.UPDATE_PROFILE);

      // ADMINの権限
      expect(permissions).toContain(Permission.CREATE_USER);
      expect(permissions).toContain(Permission.READ_USER);

      // 重複排除の確認
      const profileReadCount = permissions.filter(p => p === Permission.READ_PROFILE).length;
      expect(profileReadCount).toBe(1);
    });

    it('空配列の場合は空配列を返す', () => {
      const permissions = getPermissionsByRoles([]);
      expect(permissions).toEqual([]);
    });

    it('システム管理者単独の場合は全権限を返す', () => {
      const permissions = getPermissionsByRoles([UserRole.SYSTEM_ADMIN]);

      expect(permissions).toContain(Permission.CREATE_USER);
      expect(permissions).toContain(Permission.DELETE_USER);
      expect(permissions).toContain(Permission.MANAGE_SYSTEM);
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS);
    });
  });
});
