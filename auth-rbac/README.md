# @ori-packaging/auth-rbac

認証・認可・権限管理の共通パッケージ

## 概要

ORIパッケージングシステムで使用する認証・認可・権限管理機能を提供する共通パッケージです。

## 機能

- 🔐 **認証ガード**: JWT認証ガード
- 🛡️ **認可ガード**: ロールベース・権限ベースのアクセス制御
- 👤 **ユーザー権限管理**: きめ細かい権限制御
- 🏷️ **デコレーター**: 認証・認可の簡単な適用
- ⚙️ **設定管理**: ロールと権限のマッピング

## インストール

```bash
npm install @ori-packaging/auth-rbac
```

## 使用方法

### 基本セットアップ

```typescript
import { Module } from '@nestjs/common';
import { AuthRbacModule } from '@ori-packaging/auth-rbac';

@Module({
  imports: [AuthRbacModule],
})
export class AppModule {}
```

### コントローラーでの使用

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  RequirePermissions,
  CurrentUser,
  CurrentUserData,
  UserRole,
  Permission,
} from '@ori-packaging/auth-rbac';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
  async getUsers(@CurrentUser() user: CurrentUserData) {
    // 管理者のみアクセス可能
  }

  @Get('profile')
  @RequirePermissions(Permission.READ_PROFILE)
  async getProfile(@CurrentUser() user: CurrentUserData) {
    // プロファイル読み取り権限が必要
  }
}
```

### パブリックエンドポイント

```typescript
import { Public } from '@ori-packaging/auth-rbac';

@Controller('health')
export class HealthController {
  @Get()
  @Public() // 認証不要
  checkHealth() {
    return { status: 'ok' };
  }
}
```

### 権限サービスの使用

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionService, Permission, CurrentUserData } from '@ori-packaging/auth-rbac';

@Injectable()
export class UserService {
  constructor(private permissionService: PermissionService) {}

  async updateUser(currentUser: CurrentUserData, targetUserId: string, data: any) {
    // 権限チェック
    if (!this.permissionService.canManageUser(currentUser, targetUserId)) {
      throw new ForbiddenException('この操作には権限が必要です');
    }

    // ユーザー更新処理
  }
}
```

## 権限設定

### ロール定義

```typescript
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin', // システム管理者
  ADMIN = 'admin',               // 管理者
  USER = 'user',                 // 一般ユーザー
}
```

### 権限定義

```typescript
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
  
  // その他...
}
```

## テスト

```bash
npm test
npm run test:cov
```

## ビルド

```bash
npm run build
```

## ライセンス

MIT
