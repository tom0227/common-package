# @ori-packaging/test-utils

ORIパッケージングシステム全体で使用する統一されたテストユーティリティパッケージです。

## 特徴

- **統一されたテスト環境**: Jest設定、カスタムマッチャー、セットアップ機能
- **データベーステスト支援**: Prismaを使ったテストデータ作成・削除
- **GraphQLテスト支援**: GraphQLクエリ・ミューテーションのテスト実行
- **ファクトリーパターン**: 一貫したテストデータ生成
- **NestJS統合**: NestJSテストモジュールの簡単構築
- **日本語対応**: 日本の住所・名前・電話番号の生成

## インストール

```bash
npm install @ori-packaging/test-utils
```

## セットアップ

### Jest設定

`jest.config.js`:

```javascript
const { createJestConfig } = require('@ori-packaging/config-common');

module.exports = createJestConfig('unit', {
  setupFilesAfterEnv: ['@ori-packaging/test-utils/dist/setup/jest-setup.js'],
});
```

### TypeScript設定

カスタムマッチャーの型定義を使用するため、テストファイルで以下をインポート:

```typescript
import '@ori-packaging/test-utils';
```

## 基本的な使用方法

### 1. カスタムJestマッチャー

```typescript
import { expect } from '@jest/globals';

// UUIDの検証
expect('550e8400-e29b-41d4-a716-446655440000').toBeValidUUID();

// 日付の検証
expect(new Date()).toBeValidDate();

// メールアドレスの検証
expect('user@example.com').toBeValidEmail();

// 電話番号の検証
expect('03-1234-5678').toBeValidPhoneNumber();

// 郵便番号の検証
expect('100-0001').toBeValidPostalCode();

// タイムスタンプの検証
expect(user).toHaveValidTimestamps();

// ページネーション構造の検証
expect(response).toMatchPaginationStructure();
```

### 2. データベーステスト

```typescript
import { TestDatabase } from '@ori-packaging/test-utils';

describe('User Service', () => {
  let testDb: TestDatabase;
  let prisma: PrismaService;

  beforeEach(async () => {
    testDb = new TestDatabase(prisma);
    await testDb.cleanAll();
  });

  it('should create user', async () => {
    const user = await testDb.createTestUser({
      email: 'test@example.com',
      lastName: '田中',
      firstName: '太郎',
    });

    expect(user.id).toBeValidUUID();
    expect(user.email).toBe('test@example.com');
  });

  it('should create destination', async () => {
    const user = await testDb.createTestUser();
    const destination = await testDb.createTestDestination(user.id, {
      city: '大阪市',
    });

    expect(destination.userAccountId).toBe(user.id);
    expect(destination.city).toBe('大阪市');
  });
});
```

### 3. GraphQLテスト

```typescript
import { GraphQLTestUtil, GraphQLQueries } from '@ori-packaging/test-utils';

describe('Destinations GraphQL', () => {
  let app: INestApplication;
  let gqlTest: GraphQLTestUtil;

  beforeEach(async () => {
    gqlTest = new GraphQLTestUtil(app);
  });

  it('should get destinations', async () => {
    const token = gqlTest.createAuth0TestJWT('USER');
    const headers = gqlTest.createAuthHeaders(token);

    const response = await gqlTest.query(
      GraphQLQueries.DESTINATIONS.GET_DESTINATIONS,
      { first: 10 },
      headers
    );

    const data = gqlTest.validateGraphQLResponse(response);
    gqlTest.validatePaginationResponse(data.destinations);
  });

  it('should create destination', async () => {
    const token = gqlTest.createAuth0TestJWT('USER');
    const input = {
      lastName: '田中',
      firstName: '太郎',
      postalCode: '100-0001',
      // ...
    };

    const response = await gqlTest.mutate(
      GraphQLQueries.DESTINATIONS.CREATE_DESTINATION,
      { input },
      gqlTest.createAuthHeaders(token)
    );

    const data = gqlTest.validateGraphQLResponse(response);
    expect(data.createDestination.id).toBeValidUUID();
  });
});
```

### 4. ファクトリーパターン

```typescript
import { BaseFactory } from '@ori-packaging/test-utils';

interface User {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  role: string;
}

class UserFactory extends BaseFactory<User> {
  constructor(private prisma: PrismaService) {
    super();
  }

  protected getDefaultData(): Partial<User> {
    return {
      id: this.random.uuid(),
      email: this.random.email(),
      lastName: this.japanese.lastName(),
      firstName: this.japanese.firstName(),
      role: 'USER',
    };
  }

  protected getSequenceData(index: number): Partial<User> {
    return {
      email: `user-${index}@example.com`,
    };
  }

  async create(overrides: Partial<User> = {}): Promise<User> {
    const data = this.build(overrides);
    return this.prisma.user.create({ data });
  }
}

// 使用例
const userFactory = new UserFactory(prisma);

// 単一作成
const user = await userFactory.create({ role: 'ADMIN' });

// 複数作成
const users = await userFactory.createList(5, { role: 'USER' });

// ビルドのみ（DBに作成しない）
const userData = userFactory.build({ email: 'specific@example.com' });
const userListData = userFactory.buildList(3);
```

### 5. NestJSテストモジュール構築

```typescript
import { TestModuleBuilder, TestModulePresets } from '@ori-packaging/test-utils';

describe('User Service', () => {
  let service: UserService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    // プリセット使用
    moduleRef = await TestModulePresets.forPrismaService(UserService, mockPrisma)
      .addAuth0Mock()
      .addLoggerMock()
      .compile();

    service = moduleRef.get<UserService>(UserService);
  });
});

// カスタム構築
describe('Custom Module', () => {
  beforeEach(async () => {
    const app = await new TestModuleBuilder()
      .addProvider(MyService)
      .addMockProvider('EXTERNAL_API', mockExternalApi)
      .addConfigMock({
        API_KEY: 'test-key',
        TIMEOUT: 5001,
      })
      .createE2EApp();
  });
});
```

## 高度な使用方法

### 1. トランザクションテスト

```typescript
it('should rollback on error', async () => {
  await testDb.withTransaction(async tx => {
    await tx.user.create({ data: userData });
    await tx.destination.create({ data: destinationData });

    // トランザクション内での検証
    const users = await tx.user.findMany();
    expect(users).toHaveLength(1);

    // ロールバックは自動実行される
  });

  // トランザクション外では作成されていない
  const users = await prisma.user.findMany();
  expect(users).toHaveLength(0);
});
```

### 2. テストデータライフサイクル管理

```typescript
it('should clean up after test', async () => {
  await testDb.withTestData(
    // セットアップ
    async () => {
      const user = await testDb.createTestUser();
      const destinations = await testDb.createBulkTestData(5, () =>
        testDb.createTestDestination(user.id)
      );
      return { user, destinations };
    },
    // テスト実行
    async ({ user, destinations }) => {
      expect(destinations).toHaveLength(5);
      // テストロジック
    },
    // クリーンアップ（オプション）
    async ({ user }) => {
      await prisma.auditLog.deleteMany({
        where: { userId: user.id },
      });
    }
  );
});
```

### 3. GraphQLエラーテスト

```typescript
it('should handle authentication error', async () => {
  const response = await gqlTest.query(
    GraphQLQueries.DESTINATIONS.GET_DESTINATIONS,
    {},
    {} // 認証ヘッダーなし
  );

  const errors = gqlTest.validateGraphQLError(response, 'UNAUTHENTICATED');
  expect(errors[0].message).toContain('Authentication required');
});
```

### 4. 日本語特化データ生成

```typescript
class DestinationFactory extends BaseFactory<Destination> {
  protected getDefaultData(): Partial<Destination> {
    return {
      lastName: this.japanese.lastName(),
      firstName: this.japanese.firstName(),
      lastNameKana: this.japanese.lastNameKana(),
      firstNameKana: this.japanese.firstNameKana(),
      postalCode: this.random.postalCode(),
      prefectureCode: this.japanese.prefectureCode(),
      city: this.japanese.city(),
      town: this.japanese.town(),
      phoneNumber: this.random.phoneNumber(),
    };
  }
}
```

## 設定可能項目

### 環境変数

```bash
NODE_ENV=test                    # テスト環境の指定
DATABASE_URL=postgresql://...   # テスト用データベースURL
TEST_TIMEOUT=30000              # テストタイムアウト（ミリ秒）
```

### Jest設定のカスタマイズ

```javascript
// カスタムマッチャーの追加
expect.extend({
  toHaveSpecificProperty(received, property) {
    // カスタムマッチャーの実装
  },
});
```

## ベストプラクティス

### 1. テストデータの管理

- ✅ ファクトリーパターンを使用
- ✅ テスト間でデータが影響しないよう`cleanAll()`を実行
- ✅ 実データに近いテストデータを生成
- ❌ ハードコードされたテストデータの使用

### 2. 非同期テストの記述

```typescript
// ✅ Good
it('should handle async operation', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});

// ❌ Bad
it('should handle async operation', done => {
  service.asyncMethod().then(result => {
    expect(result).toBeDefined();
    done();
  });
});
```

### 3. モックの適切な使用

```typescript
// ✅ Good - 具体的なモック
const mockPrisma = {
  user: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(data => ({ id: 'uuid', ...data.data })),
  },
};

// ❌ Bad - 空のモック
const mockPrisma = {};
```

## トラブルシューティング

### よくある問題と解決方法

1. **型エラー**: カスタムマッチャーの型が認識されない

   ```typescript
   // 解決方法: テストファイルでインポート
   import '@ori-packaging/test-utils';
   ```

2. **データベース接続エラー**: テスト環境のDB設定確認

   ```bash
   # 環境変数の確認
   echo $DATABASE_URL
   ```

3. **GraphQLスキーマエラー**: アプリケーションの初期化確認

   ```typescript
   // app.init()が実行されているか確認
   await app.init();
   ```

4. **メモリリーク**: テスト後のクリーンアップ不足

   ```typescript
   afterEach(async () => {
     await testDb.cleanAll();
     await app.close();
   });
   ```
