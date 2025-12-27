import {
  ROLE_PERMISSIONS,
  getPermissionsByRole,
  getPermissionsByRoles,
} from './config/role-permissions.config';
import { UserRole, Permission } from './types/permission.types';

describe('RolePermissionsConfig', () => {
  describe('ROLE_PERMISSIONS', () => {
    it('ADMINはユーザー管理と宛名管理権限を持つ', () => {
      const adminPermissions = ROLE_PERMISSIONS[UserRole.ADMIN];

      // ユーザー管理権限
      expect(adminPermissions).toContain(Permission.CREATE_USER);
      expect(adminPermissions).toContain(Permission.READ_USER);
      expect(adminPermissions).toContain(Permission.UPDATE_USER);
      expect(adminPermissions).toContain(Permission.LIST_USERS);

      // 宛名管理権限
      expect(adminPermissions).toContain(Permission.CREATE_ADDRESS);
      expect(adminPermissions).toContain(Permission.READ_ADDRESS);
      expect(adminPermissions).toContain(Permission.UPDATE_ADDRESS);
      expect(adminPermissions).toContain(Permission.DELETE_ADDRESS);
      expect(adminPermissions).toContain(Permission.LIST_ADDRESSES);

      // システム管理・監査権限
      expect(adminPermissions).toContain(Permission.MANAGE_SYSTEM);
      expect(adminPermissions).toContain(Permission.VIEW_AUDIT_LOGS);
      expect(adminPermissions).toContain(Permission.DELETE_USER);
    });

    it('USERは自分のプロファイル管理のみ可能', () => {
      const userPermissions = ROLE_PERMISSIONS[UserRole.USER];

      // プロファイル管理権限
      expect(userPermissions).toContain(Permission.READ_PROFILE);
      expect(userPermissions).toContain(Permission.UPDATE_PROFILE);
      expect(userPermissions).toContain(Permission.READ_ADDRESS);
      expect(userPermissions).toContain(Permission.UPDATE_ADDRESS);

      // 他ユーザー管理権限は持たない
      expect(userPermissions).not.toContain(Permission.CREATE_USER);
      expect(userPermissions).not.toContain(Permission.DELETE_USER);
      expect(userPermissions).not.toContain(Permission.LIST_USERS);
      expect(userPermissions).not.toContain(Permission.CREATE_ADDRESS);
      expect(userPermissions).not.toContain(Permission.DELETE_ADDRESS);
      expect(userPermissions).not.toContain(Permission.LIST_ADDRESSES);
    });
  });

  describe('getPermissionsByRole', () => {
    it('指定されたロールの権限を返す', () => {
      const adminPermissions = getPermissionsByRole(UserRole.ADMIN);
      expect(adminPermissions).toEqual(ROLE_PERMISSIONS[UserRole.ADMIN]);
    });

    it('存在しないロールの場合は空配列を返す', () => {
      const invalidRole = 'INVALID_ROLE' as UserRole;
      const permissions = getPermissionsByRole(invalidRole);
      expect(permissions).toEqual([]);
    });

    it('各ロールで異なる権限を返す', () => {
      const adminPermissions = getPermissionsByRole(UserRole.ADMIN);
      const userPermissions = getPermissionsByRole(UserRole.USER);

      expect(adminPermissions.length).toBeGreaterThan(userPermissions.length);
    });
  });

  describe('getPermissionsByRoles', () => {
    it('複数のロールの権限を統合して返す', () => {
      const roles = [UserRole.USER, UserRole.ADMIN];
      const permissions = getPermissionsByRoles(roles);

      const expectedPermissions = [
        ...ROLE_PERMISSIONS[UserRole.USER],
        ...ROLE_PERMISSIONS[UserRole.ADMIN],
      ];

      // 重複を除去した期待値
      const uniqueExpectedPermissions = Array.from(new Set(expectedPermissions));

      expect(permissions).toHaveLength(uniqueExpectedPermissions.length);
      uniqueExpectedPermissions.forEach((permission) => {
        expect(permissions).toContain(permission);
      });
    });

    it('単一ロールの場合は getPermissionsByRole と同じ結果を返す', () => {
      const singleRolePermissions = getPermissionsByRoles([UserRole.ADMIN]);
      const directPermissions = getPermissionsByRole(UserRole.ADMIN);

      expect(singleRolePermissions).toEqual(directPermissions);
    });

    it('重複した権限は除去される', () => {
      const roles = [UserRole.USER, UserRole.USER]; // 同じロールを重複
      const permissions = getPermissionsByRoles(roles);
      const userPermissions = getPermissionsByRole(UserRole.USER);

      expect(permissions).toEqual(userPermissions);
    });

    it('空配列の場合は空配列を返す', () => {
      const permissions = getPermissionsByRoles([]);
      expect(permissions).toEqual([]);
    });

    it('ADMINとUSERの権限を統合できる', () => {
      const roles = [UserRole.USER, UserRole.ADMIN];
      const permissions = getPermissionsByRoles(roles);
      const combined = [
        ...ROLE_PERMISSIONS[UserRole.USER],
        ...ROLE_PERMISSIONS[UserRole.ADMIN],
      ];
      const uniqueCombined = Array.from(new Set(combined));

      expect(permissions).toHaveLength(uniqueCombined.length);
      uniqueCombined.forEach((permission) => {
        expect(permissions).toContain(permission);
      });
    });
  });

  describe('権限の階層性', () => {
    it('ADMINはUSERのすべての権限を包含する', () => {
      const adminPermissions = getPermissionsByRole(UserRole.ADMIN);
      const userPermissions = getPermissionsByRole(UserRole.USER);

      userPermissions.forEach((permission) => {
        expect(adminPermissions).toContain(permission);
      });
    });
  });

  describe('特定の権限の存在確認', () => {
    it('システム管理権限はADMINのみが持つ', () => {
      expect(getPermissionsByRole(UserRole.ADMIN)).toContain(Permission.MANAGE_SYSTEM);
      expect(getPermissionsByRole(UserRole.USER)).not.toContain(Permission.MANAGE_SYSTEM);
    });

    it('ユーザー削除権限はADMINのみが持つ', () => {
      expect(getPermissionsByRole(UserRole.ADMIN)).toContain(Permission.DELETE_USER);
      expect(getPermissionsByRole(UserRole.USER)).not.toContain(Permission.DELETE_USER);
    });

    it('監査ログ閲覧権限はADMINのみが持つ', () => {
      expect(getPermissionsByRole(UserRole.ADMIN)).toContain(Permission.VIEW_AUDIT_LOGS);
      expect(getPermissionsByRole(UserRole.USER)).not.toContain(Permission.VIEW_AUDIT_LOGS);
    });
  });
});
