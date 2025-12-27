# @ori-packaging/config-common

ORIパッケージングシステム全体で使用する共通設定ファイルパッケージです。

## 特徴

- **統一された設定**: ESLint、TypeScript、Jest、Prettierの設定を統一
- **型安全性重視**: TypeScriptの厳密な設定でバグを事前防止
- **NestJS最適化**: NestJSプロジェクトに最適化された設定
- **テスト環境対応**: 単体・統合・E2Eテストの設定を提供
- **開発体験向上**: Prettier、ESLintによる一貫したコードスタイル

## インストール

```bash
npm install @ori-packaging/config-common
```

## 使用方法

### ESLint設定

`.eslintrc.js`:

```javascript
const { getConfigPaths } = require('@ori-packaging/config-common');

module.exports = {
  ...require(getConfigPaths().eslint),
  parserOptions: {
    ...require(getConfigPaths().eslint).parserOptions,
    tsconfigRootDir: __dirname,
  },
};
```

### TypeScript設定

`tsconfig.json`:

```json
{
  "extends": "./node_modules/@ori-packaging/config-common/configs/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}
```

### Jest設定

`jest.config.js`:

```javascript
const { createJestConfig } = require('@ori-packaging/config-common');

module.exports = createJestConfig('unit', {
  displayName: 'my-service',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
});
```

### 統合・E2Eテスト設定

`test/jest-integration.json`:

```javascript
const { createJestConfig } = require('@ori-packaging/config-common');

module.exports = createJestConfig('integration', {
  displayName: 'Integration Tests',
});
```

### Prettier設定

`.prettierrc.js`:

```javascript
const { getConfigPaths } = require('@ori-packaging/config-common');
module.exports = require(getConfigPaths().prettier);
```

## TypeScript設定の詳細

### 型安全性の強化

- `strict: true` - すべての厳密な型チェックを有効
- `noImplicitAny: true` - any型の暗黙的使用を禁止
- `strictNullChecks: true` - null/undefinedの厳密チェック
- `noUncheckedIndexedAccess: true` - 配列・オブジェクトアクセスの安全性

### NestJS最適化

- `emitDecoratorMetadata: true` - デコレーターメタデータの生成
- `experimentalDecorators: true` - デコレーター機能の有効化

## ESLint設定の詳細

### セキュリティルール

- `no-eval` - eval()の使用禁止
- `no-implied-eval` - 暗黙的eval()の禁止
- `@typescript-eslint/no-unsafe-*` - 型安全でない操作の禁止

### 型安全性ルール

- `@typescript-eslint/no-explicit-any` - any型の使用禁止
- `@typescript-eslint/prefer-nullish-coalescing` - null合体演算子の推奨
- `@typescript-eslint/prefer-optional-chain` - オプショナルチェーンの推奨

### テストファイル例外

テストファイル(`*.spec.ts`等)では一部ルールを緩和し、テストの記述性を優先します。

## Jest設定の詳細

### テスト種別対応

- **Unit Tests**: 単体テスト用設定
- **Integration Tests**: 統合テスト用設定（タイムアウト延長）
- **E2E Tests**: E2Eテスト用設定（さらなるタイムアウト延長）

### カバレッジ設定

- 全テスト種別で80%以上のカバレッジを要求
- HTML、LCOV、Clover形式でレポート出力

## プロジェクトでの適用例

### 新規プロジェクトの場合

```bash
# パッケージインストール
npm install @ori-packaging/config-common

# 設定ファイル作成
echo 'module.exports = require("@ori-packaging/config-common/configs/eslint.config");' > .eslintrc.js
echo 'module.exports = require("@ori-packaging/config-common/configs/prettier.config");' > .prettierrc.js

# tsconfig.jsonの作成
cat > tsconfig.json << 'EOF'
{
  "extends": "./node_modules/@ori-packaging/config-common/configs/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
EOF
```

### 既存プロジェクトの場合

1. 既存設定ファイルのバックアップ
2. 段階的に共通設定に移行
3. プロジェクト固有の設定のみ残す

## トラブルシューティング

### TypeScriptエラーの解決

型エラーが多発する場合は、段階的に厳密性を上げる:

```json
{
  "extends": "./node_modules/@ori-packaging/config-common/configs/tsconfig.base.json",
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false
  }
}
```

その後、徐々に`true`に変更していきます。

### ESLintエラーの解決

一時的にルールを無効化:

```javascript
module.exports = {
  ...require('@ori-packaging/config-common/configs/eslint.config'),
  rules: {
    ...require('@ori-packaging/config-common/configs/eslint.config').rules,
    '@typescript-eslint/no-explicit-any': 'warn', // error -> warn
  },
};
```

## 設定のカスタマイズ

プロジェクト固有の要件がある場合は、基本設定を拡張:

```javascript
const baseConfig = require('@ori-packaging/config-common/configs/eslint.config');

module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    // プロジェクト固有のルール
    'custom-rule': 'error',
  },
};
```
