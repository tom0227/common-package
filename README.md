# Common Packages

このリポジトリは、NestJS アプリケーション開発で使用する共通パッケージを管理しています。

## パッケージ一覧

- **@tom0227/auth-rbac** - 認証・ロールベースアクセス制御
- **@tom0227/config-common** - 共通設定（ESLint、Prettier、Jest、TypeScript）
- **@tom0227/shared-modules** - 共有モジュール（認証、キャッシュ、データベース、ログ等）
- **@tom0227/test-utils** - テストユーティリティ

## インストール方法

これらのパッケージはGitHub Packagesでプライベートパッケージとして公開されています。

### 1. 認証設定

プロジェクトのルートディレクトリに`.npmrc`ファイルを作成し、以下の内容を追加します：

```
@tom0227:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. GitHub Personal Access Token の設定

1. GitHubの[Personal Access Tokens](https://github.com/settings/tokens)ページへアクセス
2. "Generate new token (classic)" を選択
3. 以下のスコープを選択：
   - `read:packages` - パッケージの読み取り
4. トークンを生成し、`.npmrc`ファイルに直接追加するか環境変数に設定：

**方法1: .npmrcファイルに直接記載**
```
@tom0227:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=your_personal_access_token
```

**方法2: 環境変数を使用**
```bash
export GITHUB_TOKEN=your_personal_access_token
```
そして`.npmrc`に以下を記載：
```
@tom0227:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 3. パッケージのインストール

```bash
# 個別インストール
npm install @tom0227/auth-rbac
npm install @tom0227/config-common
npm install @tom0227/shared-modules
npm install @tom0227/test-utils

# または一括インストール
npm install @tom0227/auth-rbac @tom0227/config-common @tom0227/shared-modules @tom0227/test-utils
```

## 使用例

### @tom0227/auth-rbac

認証・ロールベースアクセス制御機能を提供します。

```typescript
import { AuthRbacModule, Roles, Permissions } from '@tom0227/auth-rbac';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AuthRbacModule.register({
      // Auth0設定やロール・権限設定
    }),
  ],
})
export class AppModule {}

// 使用例
@Roles('admin')
@Permissions('users:read')
@Controller('users')
export class UsersController {
  // ...
}
```

### @tom0227/config-common

ESLint、Prettier、Jest、TypeScriptの共通設定を提供します。

```typescript
// eslint.config.js
module.exports = require('@tom0227/config-common/configs/eslint.config.js');

// jest.config.js
module.exports = require('@tom0227/config-common/configs/jest.config.js');

// prettier.config.js
module.exports = require('@tom0227/config-common/configs/prettier.config.js');
```

### @tom0227/shared-modules

データベース、キャッシュ、ログ等の共有機能を提供します。

```typescript
import { 
  PrismaModule, 
  LoggingModule, 
  CacheModule,
  AuthModule 
} from '@tom0227/shared-modules';

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    CacheModule,
    AuthModule,
  ],
})
export class AppModule {}
```

### @tom0227/test-utils

テスト用のユーティリティ関数を提供します。

```typescript
import { createTestModule } from '@tom0227/test-utils';

describe('UserService', () => {
  let module: TestingModule;
  
  beforeEach(async () => {
    module = await createTestModule({
      // テスト設定
    });
  });
});
```

## 開発者向け情報

### パッケージの公開

PRがmainブランチにマージされると、GitHub Actionsが自動的に以下を実行します：

1. 各パッケージのビルド
2. テストの実行
3. バージョンの自動インクリメント（パッチバージョン）
4. GitHub Packagesへの公開
5. リリースタグの作成

### ローカル開発

```bash
# リポジトリのクローン
git clone https://github.com/tom0227/common-package.git
cd common-package

# 各パッケージの依存関係をインストール
cd auth-rbac && npm install && cd ..
cd config-common && npm install && cd ..
cd shared-modules && npm install && cd ..
cd test-utils && npm install && cd ..

# 各パッケージのビルド・テスト
cd auth-rbac && npm run build && npm test && cd ..
cd config-common && npm run build && npm test && cd ..
cd shared-modules && npm run build && npm test && cd ..
cd test-utils && npm run build && npm test && cd ..
```

### パッケージ使用前の確認

パッケージを使用する前に、以下を確認してください：

1. **GitHub認証**: `.npmrc`ファイルが正しく設定されている
2. **パッケージの存在確認**: `npm view @tom0227/パッケージ名` でパッケージが公開されているか確認
3. **最新バージョンの確認**: `npm view @tom0227/パッケージ名 version` で最新バージョンを確認

### バージョン管理

- パッチリリース: バグ修正
- マイナーリリース: 後方互換性のある新機能
- メジャーリリース: 破壊的変更

## ライセンス

MIT