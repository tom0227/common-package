import { Injectable } from '@nestjs/common';
import {
  UserRole,
  Permission,
  PermissionContext,
  CurrentUserData,
} from '../types/permission.types';
import { getPermissionsByRoles } from '../config/role-permissions.config';

@Injectable()
export class PermissionService {
  /**
   * ユーザーが特定の権限を持っているかチェック
   */
  hasPermission(user: CurrentUserData, permission: Permission): boolean {
    const userPermissions = getPermissionsByRoles(user.roles);
    return userPermissions.includes(permission);
  }

  /**
   * ユーザーが特定のリソースに対する権限を持っているかチェック
   */
  hasResourcePermission(user: CurrentUserData, context: PermissionContext): boolean {
    // 基本的な権限チェック
    if (!this.hasPermission(user, context.action)) {
      return false;
    }

    // リソース所有者チェック（自分のリソースかどうか）
    if (context.ownerId && context.ownerId === user.userId) {
      return true;
    }

    // 管理者権限チェック
    if (user.roles.includes(UserRole.SYSTEM_ADMIN)) {
      return true;
    }

    // 通常の管理者は管理対象ユーザーのリソースにアクセス可能
    if (user.roles.includes(UserRole.ADMIN)) {
      if (context.resourceId && user.managedUsers?.includes(context.resourceId)) {
        return true;
      }
      // 管理者は一般的な読み取り権限を持つ
      if (this.isReadOnlyPermission(context.action)) {
        return true;
      }
    }

    return false;
  }

  /**
   * ユーザーが他のユーザーを管理できるかチェック
   */
  canManageUser(currentUser: CurrentUserData, targetUserId: string): boolean {
    // システム管理者は全ユーザー管理可能
    if (currentUser.roles.includes(UserRole.SYSTEM_ADMIN)) {
      return true;
    }

    // 管理者は管理対象ユーザーのみ管理可能
    if (currentUser.roles.includes(UserRole.ADMIN)) {
      return currentUser.managedUsers?.includes(targetUserId) || false;
    }

    // 自分自身の管理（プロファイル更新など）
    return currentUser.userId === targetUserId;
  }

  /**
   * 読み取り専用権限かどうかチェック
   */
  private isReadOnlyPermission(permission: Permission): boolean {
    const readOnlyPermissions = [
      Permission.READ_USER,
      Permission.READ_PROFILE,
      Permission.READ_ADDRESS,
      Permission.LIST_USERS,
      Permission.LIST_ADDRESSES,
      Permission.VIEW_AUDIT_LOGS,
    ];
    return readOnlyPermissions.includes(permission);
  }

  /**
   * ユーザーの全権限を取得
   */
  getUserPermissions(user: CurrentUserData): Permission[] {
    return getPermissionsByRoles(user.roles);
  }

  /**
   * ロールの権限レベルを比較（数値が大きいほど権限が強い）
   */
  getRoleLevel(role: UserRole): number {
    const roleLevels = {
      [UserRole.USER]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SYSTEM_ADMIN]: 3,
    };
    return roleLevels[role] || 0;
  }

  /**
   * ユーザーが特定のロール以上の権限を持っているかチェック
   */
  hasRoleLevel(user: CurrentUserData, requiredRole: UserRole): boolean {
    const requiredLevel = this.getRoleLevel(requiredRole);
    return user.roles.some(role => this.getRoleLevel(role) >= requiredLevel);
  }
}
