# tfme - Terraform Schema Exporter

## プロジェクト概要

### 基本情報
- **プロジェクト名**: `@infodb/tfme`
- **バージョン**: 0.2.0
- **ライセンス**: MIT

### ツールの目的
Terraform provider schemaから指定したリソースのスキーマをYAML形式に変換し、Terraform Registry APIからリソースのMarkdownドキュメントをダウンロードするCLIツール。プロバイダ名はリソース名から自動推測。

## 技術仕様

### アーキテクチャ
- **言語**: TypeScript
- **ランタイム**: Node.js
- **CLI Framework**: Commander.js 12.1.0
- **YAML処理**: yaml 2.6.1
- **HTTP Client**: Built-in fetch API

### 主要コンポーネント

#### 1. コマンド (`src/commands/`)
- `export.ts`: 指定リソースのschemaをYAMLに変換（単純変換、加工なし）、プロバイダ名自動推測
- `download.ts`: Terraform Registry APIからMarkdownドキュメントダウンロード、プロバイダ名自動推測

#### 2. ユーティリティ (`src/utils/`)
- `converter.ts`: JSON → YAML単純変換
- `schema-fetcher.ts`: GitHubからのスキーマ取得＋ローカルキャッシュ
- `registry-client.ts`: Terraform Registry API v2クライアント

#### 3. スキーマ管理 (`schemas/`)
- `terraform/{provider}/`: プロバイダごとのTerraform設定
- `providers/`: 生成されたスキーマJSONファイル
- `scripts/generate-schemas.sh`: スキーマ生成スクリプト

## プロジェクト構造

```
tfme/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
├── bin/
│   └── cli.js               # CLIエントリーポイント
├── src/
│   ├── index.ts              # メインエントリーポイント
│   ├── commands/
│   │   ├── export.ts         # YAML export コマンド
│   │   └── download.ts       # ドキュメントダウンロードコマンド
│   └── utils/
│       ├── converter.ts      # JSON→YAML変換
│       ├── schema-fetcher.ts # スキーマ取得＋キャッシュ
│       └── registry-client.ts # Registry API クライアント
└── schemas/
    ├── terraform/
    │   ├── aws/provider.tf
    │   ├── azurerm/provider.tf
    │   └── google/provider.tf
    ├── providers/
    │   ├── aws.json          # 生成されたスキーマ
    │   ├── azurerm.json
    │   └── google.json
    └── scripts/
        └── generate-schemas.sh
```

## 機能詳細

### 1. Export コマンド

指定したリソースのschemaをYAML形式に変換します。

**処理フロー**:
1. リソース名からプロバイダ名を自動推測（例: `aws_vpc` → `aws`）
2. スキーマ取得（GitHub/キャッシュ または ローカルファイル）
3. 指定リソースのschemaを抽出
4. JSON → YAML 単純変換（データ加工なし）
5. ファイル出力（`{resource}.yaml`）

**プロバイダ名自動推測**:
- リソース名のプレフィックスから自動判定（`aws_vpc` → `aws`）
- Terraformの命名規則により100%推測可能

**GitHubリポジトリ統合**:
- URL: `https://raw.githubusercontent.com/tamuto/infodb-cli/main/tfme/schemas/providers/{provider}.json`
- ローカルキャッシュ: `~/.tfme/cache/{provider}.json`
- キャッシュクリア: `--clear-cache` フラグ

### 2. Download コマンド

指定したリソースのMarkdownドキュメントをTerraform Registry APIからダウンロードします。

**処理フロー**:
1. リソース名からプロバイダ名を自動推測（例: `aws_vpc` → `aws`）
2. プロバイダーバージョンID取得
   - API: `/v2/providers/{namespace}/{name}/provider-versions`
3. ドキュメント一覧取得（ページネーション対応）
   - API: `/v2/provider-docs?filter[provider-version]={id}&filter[category]={category}`
4. 個別ドキュメントコンテンツ取得
   - API: `/v2/provider-docs/{doc_id}`
5. Markdown保存（`{resource}.md`）

**プロバイダ名自動推測**:
- リソース名のプレフィックスから自動判定（`aws_vpc` → `aws`）
- Terraformの命名規則により100%推測可能

**レート制限対応**:
- リクエスト間隔: 100ms
- ページ間隔: 500ms

**リソース名処理**:
- 入力: `aws_vpc`
- slug変換: `vpc` (プロバイダープレフィックス除去)

## 開発コマンド

```bash
# 依存関係インストール
cd tfme
pnpm install

# ビルド
pnpm run build

# 開発モード（watch）
pnpm run dev

# ローカル実行
pnpm run start export -r aws_vpc -o output
pnpm run start download -r aws_vpc -o docs
```

## 使用例

### 基本的な使用方法

```bash
# グローバルインストール
npm install -g @infodb/tfme

# または pnpx で実行
pnpx @infodb/tfme export -p aws -o output
pnpx @infodb/tfme download -p aws -r aws_vpc -o docs
```

### YAML エクスポート

```bash
# リソース指定（プロバイダ名は自動推測）
pnpx @infodb/tfme export -r aws_vpc -o output

# キャッシュクリアして再取得
pnpx @infodb/tfme export -r azurerm_virtual_network --clear-cache -o output
```

### ドキュメントダウンロード

```bash
# リソース指定（プロバイダ名は自動推測）
pnpx @infodb/tfme download -r aws_vpc -o docs

# 特定バージョン指定
pnpx @infodb/tfme download -r aws_s3_bucket -v 5.0.0 -o docs

# カスタムnamespace
pnpx @infodb/tfme download -r custom_resource -n mycompany -o docs
```

## スキーマ生成（リポジトリメンテナー向け）

プロバイダースキーマを生成してリポジトリに格納:

```bash
cd schemas/scripts
./generate-schemas.sh
```

**生成処理**:
1. 各プロバイダーディレクトリでTerraform初期化
2. `terraform providers schema -json` 実行
3. `schemas/providers/{provider}.json` に保存
4. リポジトリにコミット

## 出力フォーマット

### YAML 出力

指定したリソースのschemaのみをYAMLに変換（加工なし）:

```yaml
version: 1
block:
  attributes:
    arn:
      type: string
      description_kind: plain
      computed: true
    cidr_block:
      type: string
      description_kind: plain
      optional: true
      computed: true
    enable_dns_support:
      type: bool
      description_kind: plain
      optional: true
```

### Markdown ドキュメント

Terraform公式ドキュメント形式:

```markdown
---
subcategory: "VPC (Virtual Private Cloud)"
layout: "aws"
page_title: "AWS: aws_vpc"
---

# Resource: aws_vpc

Provides a VPC resource.
```

## キャッシュディレクトリ

```
~/.tfme/
└── cache/
    ├── aws.json
    ├── azurerm.json
    └── google.json
```

## 開発・リリース手順

### バージョン更新手順

新しいバージョンをリリースする際は、以下の2つのファイルでバージョン番号を更新する必要があります：

1. **package.json** - パッケージのバージョン
```json
"version": "0.2.0"
```

2. **src/index.ts** - CLIのversionメソッド
```typescript
.version('0.2.0')
```

### バージョン更新の実行例

```bash
# 1. package.jsonとsrc/index.tsの両方でバージョンを更新
# 2. 変更をコミット
git add package.json src/index.ts
git commit -m "Bump version to 0.2.0"

# 3. プッシュ
git push
```

## トラブルシューティング

### よくある問題

1. **Schema not found**: GitHubリポジトリにスキーマファイルが存在することを確認
2. **Document not found**: リソース名が正しいか確認（`aws_vpc`など、プロバイダープレフィックス付き）
3. **Rate limit**: レート制限に達した場合は時間をおいて再実行
4. **Cache issues**: `--clear-cache`フラグでキャッシュクリア

### デバッグ

```bash
# 詳細ログ出力（開発時）
pnpm run start export -r aws_vpc -o output

# キャッシュ確認
ls -la ~/.tfme/cache/

# キャッシュクリアして再取得
pnpm run start export -r aws_vpc --clear-cache -o output
```

## API仕様

### Terraform Registry API v2

**Base URL**: `https://registry.terraform.io`

**主要エンドポイント**:
1. プロバイダーバージョン一覧
   - `GET /v2/providers/{namespace}/{name}/provider-versions`
2. ドキュメント一覧
   - `GET /v2/provider-docs?filter[provider-version]={id}`
3. ドキュメント詳細
   - `GET /v2/provider-docs/{doc_id}`

## 今後の改善案

### 短期的改善
- [ ] プログレスバーの追加
- [ ] 並列ダウンロード対応
- [ ] エラーリカバリー機能

### 長期的改善
- [ ] データソースのサポート強化
- [ ] カスタムフィルタリング
- [ ] Web UIの提供
- [ ] CI/CD統合サポート

## メンテナンス時の注意点

### 依存関係更新
- Commander.js, YAML, TypeScriptの最新版を定期チェック
- Terraform Registry API仕様の変更に注意

### テスト
- 主要プロバイダー（AWS, Azure, GCP）での動作確認
- エッジケース（大容量スキーマ、レート制限など）のテスト

---

**最終更新**: 2025年11月15日
**次回メンテナンス推奨**: 3ヶ月後（依存関係更新チェック）
