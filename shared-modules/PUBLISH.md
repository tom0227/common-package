# @ori-packaging/shared-modules Publishing Guide

このパッケージはGitHub Packagesを使用してプライベートNPMパッケージとして公開されています。

## 📦 パッケージの公開方法

### 自動公開（推奨）

`main`ブランチに`common-packages/shared-modules`配下の変更がプッシュされると、GitHub Actionsが自動的にパッケージをビルド・公開します。

### 手動公開

```bash
cd common-packages/shared-modules

# バージョン更新
npm version patch  # または minor, major

# ビルド
npm run build

# GitHub Packagesに公開
npm publish
```

## 🔧 ローカル開発環境でのセットアップ

### 1. GitHub Personal Access Tokenの作成

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)"をクリック
3. 必要なスコープを選択：
   - `read:packages` - パッケージの読み取り
   - `write:packages` - パッケージの公開（公開する場合のみ）
4. トークンをコピー

### 2. ローカルの.npmrcファイルを設定

プロジェクトルートまたはホームディレクトリに`.npmrc`を作成：

```bash
# プロジェクトルートで
cp .npmrc.example .npmrc

# YOUR_GITHUB_TOKENを実際のトークンに置き換え
@ori-packaging:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
registry=https://registry.npmjs.org/
```

**重要**: `.npmrc`ファイルは`.gitignore`に追加されているため、Gitにコミットされません。

### 3. パッケージのインストール

```bash
cd gacha-service  # または他のサービス
npm install
```

## 🚀 CI/CD環境での使用

GitHub ActionsのワークフローではGitHub_TOKENが自動的に使用されるため、追加の設定は不要です。

```yaml
- name: Configure for CI environment
  run: |
    echo "@ori-packaging:registry=https://npm.pkg.github.com" > .npmrc
    echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> .npmrc
    echo "registry=https://registry.npmjs.org/" >> .npmrc
```

## 📝 バージョン管理

セマンティックバージョニング（SemVer）に従ってバージョンを管理します：

- **MAJOR**: 互換性のない変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

```bash
npm version patch  # 1.2.0 → 1.2.1
npm version minor  # 1.2.0 → 1.3.0
npm version major  # 1.2.0 → 2.0.0
```

## 🔍 トラブルシューティング

### エラー: `404 Not Found - GET https://npm.pkg.github.com/@ori-packaging/shared-modules`

**原因**: GitHub Personal Access Tokenが設定されていない、または権限が不足している

**解決策**:
1. `.npmrc`ファイルが正しく設定されているか確認
2. トークンに`read:packages`権限があるか確認
3. トークンが有効期限切れでないか確認

### エラー: `npm ERR! 403 Forbidden`

**原因**: トークンの権限不足またはパッケージへのアクセス権限がない

**解決策**:
1. リポジトリへのアクセス権があるか確認
2. トークンに適切な権限があるか確認

## 📚 関連リンク

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [Working with npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
