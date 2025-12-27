/**
 * 権限管理の基本型定義
 */

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum Permission {
  // ユーザー管理
  CREATE_USER = 'users:create',
  READ_USER = 'users:read',
  UPDATE_USER = 'users:update',
  DELETE_USER = 'users:delete',
  LIST_USERS = 'users:list',

  // プロファイル管理
  READ_PROFILE = 'profile:read',
  UPDATE_PROFILE = 'profile:update',

  // システム管理
  MANAGE_SYSTEM = 'system:manage',
  VIEW_AUDIT_LOGS = 'audit:read',

  // 宛名管理（将来の拡張用）
  CREATE_ADDRESS = 'addresses:create',
  READ_ADDRESS = 'addresses:read',
  UPDATE_ADDRESS = 'addresses:update',
  DELETE_ADDRESS = 'addresses:delete',
  LIST_ADDRESSES = 'addresses:list',
}

export enum ResourceType {
  USER = 'user',
  PROFILE = 'profile',
  ADDRESS = 'address',
  SYSTEM = 'system',
}

export interface RolePermissionMapping {
  [UserRole.ADMIN]: Permission[];
  [UserRole.USER]: Permission[];
}

export interface PermissionContext {
  resourceType: ResourceType;
  resourceId?: string;
  ownerId?: string;
  action: Permission;
}

export interface UserPermissions {
  userId: string;
  roles: UserRole[];
  permissions: Permission[];
  managedUsers?: string[];
}
