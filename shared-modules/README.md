# @ori-packaging/shared-modules

ORI パッケージングシステムの共通モジュール集

## 概要

マイクロサービス間で共有される横断的関心事を実装した共通モジュールパッケージです。

## 含まれるモジュール

### Database Module
- Prisma クライアントの拡張
- 自動リトライ機能
- ヘルスチェック
- 接続プール管理
- メトリクス収集

### Auth Module
- Auth0 統合
- JWT 認証戦略
- 認可ガード
- デコレーター

### Cache Module
- Redis 統合
- TTL 管理
- JSON シリアライゼーション

### Audit Module
- 監査ログ記録
- 変更追跡
- 検索機能

### Logging Module
- 構造化ログ
- 相関ID管理
- パフォーマンス計測

### Exceptions Module
- 共通例外定義
- エラーフィルター

### RBAC Module
- ロール・権限管理
- アクセス制御

## インストール

```bash
npm install @ori-packaging/shared-modules
```

## 使用方法

```typescript
import { DatabaseModule } from '@ori-packaging/shared-modules';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
```

## 開発

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# テスト
npm test

# 開発モード
npm run build:watch
```