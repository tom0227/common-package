# Common Packages

このリポジトリは、ORIパッケージングシステムで使用する共通パッケージを管理しています。

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
@tom0227:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. GitHub Personal Access Token の設定

1. GitHubの[Personal Access Tokens](https://github.com/settings/tokens)ページへアクセス
2. "Generate new token" をクリック
3. 以下のスコープを選択：
   - `read:packages` - パッケージの読み取り
   - `write:packages` - パッケージの公開（開発者のみ）
   - `delete:packages` - パッケージの削除（管理者のみ）
4. トークンを生成し、環境変数に設定：

```bash
export GITHUB_TOKEN=your_personal_access_token
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

```typescript
import { AuthRbacModule } from '@tom0227/auth-rbac';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AuthRbacModule.register({
      // 設定オプション
    }),
  ],
})
export class AppModule {}
```

### @tom0227/shared-modules

```typescript
import { PrismaModule, LoggingModule } from '@tom0227/shared-modules';

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
  ],
})
export class AppModule {}
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

# 依存関係のインストール
cd auth-rbac && npm install
cd ../config-common && npm install
cd ../shared-modules && npm install
cd ../test-utils && npm install

# ビルド
npm run build

# テスト
npm test
```

### バージョン管理

- パッチリリース: バグ修正
- マイナーリリース: 後方互換性のある新機能
- メジャーリリース: 破壊的変更

## ライセンス

MIT