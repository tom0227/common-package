import { UserRole, Permission, RolePermissionMapping } from '../types/permission.types';

/**
 * ロールと権限のマッピング設定
 */
export const ROLE_PERMISSIONS: RolePermissionMapping = {
  [UserRole.SYSTEM_ADMIN]: [
    // 全権限
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.LIST_USERS,
    Permission.READ_PROFILE,
    Permission.UPDATE_PROFILE,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_AUDIT_LOGS,
    Permission.CREATE_ADDRESS,
    Permission.READ_ADDRESS,
    Permission.UPDATE_ADDRESS,
    Permission.DELETE_ADDRESS,
    Permission.LIST_ADDRESSES,
  ],

  [UserRole.ADMIN]: [
    // ユーザー管理権限
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.LIST_USERS,
    Permission.READ_PROFILE,
    Permission.UPDATE_PROFILE,

    // 宛名管理権限
    Permission.CREATE_ADDRESS,
    Permission.READ_ADDRESS,
    Permission.UPDATE_ADDRESS,
    Permission.DELETE_ADDRESS,
    Permission.LIST_ADDRESSES,
  ],

  [UserRole.USER]: [
    // 自分のプロファイル管理のみ
    Permission.READ_PROFILE,
    Permission.UPDATE_PROFILE,
    Permission.READ_ADDRESS,
    Permission.UPDATE_ADDRESS,
  ],
};

/**
 * 特定のロールが持つ権限を取得
 */
export function getPermissionsByRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * 複数のロールから全権限を取得
 */
export function getPermissionsByRoles(roles: UserRole[]): Permission[] {
  const permissions = new Set<Permission>();
  roles.forEach(role => {
    getPermissionsByRole(role).forEach(permission => {
      permissions.add(permission);
    });
  });
  return Array.from(permissions);
}
