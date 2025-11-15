# tfme - Terraform Schema Exporter

## プロジェクト概要

### 基本情報
- **プロジェクト名**: `@infodb/tfme`
- **バージョン**: 0.1.0
- **ライセンス**: MIT

### ツールの目的
Terraform provider schemaをYAML形式に変換し、Terraform RegistryからリソースのドキュメントをダウンロードするCLIツール。多言語対応のドキュメント管理を支援。

## 技術仕様

### アーキテクチャ
- **言語**: TypeScript
- **ランタイム**: Node.js
- **CLI Framework**: Commander.js 12.1.0
- **YAML処理**: yaml 2.6.1
- **出力**: Chalk 5.3.0

### 主要コンポーネント

#### 1. コマンド (`src/commands/`)
- `export.ts`: Provider schemaをYAMLに変換
- `download.ts`: Terraform Registryからドキュメントダウンロード

#### 2. パーサー (`src/parsers/`)
- `schema-parser.ts`: Terraform provider schema JSONのパース

#### 3. ジェネレーター (`src/generators/`)
- `yaml-generator.ts`: YAML出力の生成（単一ファイル/分割ファイル）

#### 4. ユーティリティ (`src/utils/`)
- `registry-client.ts`: Terraform RegistryへのHTTPリクエスト

#### 5. 型定義 (`src/types/`)
- `schema.ts`: Terraform schema型とYAML出力型の定義

## プロジェクト構造

```
tfme/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
├── bin/
│   └── cli.js               # CLIエントリーポイント
└── src/
    ├── index.ts              # メインエントリーポイント
    ├── commands/
    │   ├── export.ts         # YAML export コマンド
    │   └── download.ts       # ドキュメントダウンロードコマンド
    ├── parsers/
    │   └── schema-parser.ts  # Schema JSONパーサー
    ├── generators/
    │   └── yaml-generator.ts # YAML生成
    ├── utils/
    │   └── registry-client.ts # Registry API クライアント
    └── types/
        └── schema.ts         # 型定義
```

## 機能詳細

### 1. Export コマンド

Terraform provider schemaをYAML形式に変換します。

**基本機能**:
- 全プロバイダーのエクスポート
- 特定プロバイダーのフィルタリング
- 特定リソースのフィルタリング
- 単一ファイル出力
- 分割ファイル出力（リソースごと）

**出力形式**:
- プロバイダー情報（namespace, name, version）
- リソース定義
- 属性情報（type, required, optional, etc.）
- ブロック定義（nested構造）
- 多言語対応（en_us, ja_jp）

### 2. Download コマンド

Terraform Registryから公式ドキュメントをダウンロードします。

**基本機能**:
- 全リソースのドキュメントダウンロード
- 特定プロバイダーのフィルタリング
- 特定リソースのフィルタリング
- バージョン指定（デフォルト: latest）

**ダウンロード先**:
- Terraform Registry: `https://registry.terraform.io`
- パス形式: `/v1/providers/{namespace}/{name}/{version}/docs`

## 開発コマンド

```bash
# 依存関係インストール
cd tfme
npm install

# ビルド
npm run build

# 開発モード（watch）
npm run dev

# ローカル実行
npm run start export providers.json -o output
npm run start download providers.json -o docs
```

## 使用例

### 基本的な使用方法

```bash
# グローバルインストール
npm install -g @infodb/tfme

# または pnpx で実行
pnpx @infodb/tfme export providers.json -o output --split
pnpx @infodb/tfme download providers.json -p aws -o docs
```

### Terraform schema生成

```bash
cd path/to/terraform
terraform init
terraform providers schema -json > providers.json
```

### YAML エクスポート

```bash
# 全プロバイダーを分割ファイルで出力
pnpx @infodb/tfme export providers.json -o output --split

# 特定プロバイダー（AWS）のみ
pnpx @infodb/tfme export providers.json -p aws -o output --split

# 特定リソースのみ
pnpx @infodb/tfme export providers.json -p aws -r aws_instance -o output
```

### ドキュメントダウンロード

```bash
# AWS プロバイダーのドキュメント全体
pnpx @infodb/tfme download providers.json -p aws -o docs

# 特定リソースのドキュメント
pnpx @infodb/tfme download providers.json -p aws -r aws_instance -o docs

# バージョン指定
pnpx @infodb/tfme download providers.json -p aws -v 5.0.0 -o docs
```

## 出力ファイル構造

### 分割ファイル構造（--split）

```
output/
  aws/
    resources/
      aws_instance.yaml
      aws_s3_bucket.yaml
      ...
  azurerm/
    resources/
      azurerm_virtual_machine.yaml
      ...
```

### ドキュメントファイル構造

```
docs/
  aws/
    resources/
      aws_instance.md
      aws_s3_bucket.md
      ...
```

## YAML 出力フォーマット

```yaml
provider_info:
  namespace: hashicorp
  name: aws
  version: "5.0.0"

resources:
  aws_instance:
    name: aws_instance
    type: resource
    description:
      en_us: "Provides an EC2 instance resource"
      ja_jp: ""
    attributes:
      ami:
        name: ami
        type: string
        required: true
        description:
          en_us: "AMI to use for the instance"
          ja_jp: ""
    blocks:
      ebs_block_device:
        name: ebs_block_device
        nesting_mode: list
        description:
          en_us: "Additional EBS block devices"
          ja_jp: ""
        attributes:
          device_name:
            name: device_name
            type: string
            required: true
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

1. **providers.json not found**: Terraform schemaファイルが存在することを確認
2. **型エラー**: TypeScriptビルドエラーは`npm run build`で確認
3. **ダウンロードエラー**: Terraform Registryへの接続を確認
4. **YAML構文エラー**: 生成されたYAMLファイルの構文を確認

### デバッグ

```bash
# TypeScriptコンパイルエラー確認
npm run build

# ローカルで実行してログ確認
npm run start export providers.json -o output
npm run start download providers.json -o docs
```

## 今後の改善案

### 短期的改善
- [ ] データソース（data sources）のサポート
- [ ] エラーハンドリングの強化
- [ ] プログレスバーの追加
- [ ] 並列ダウンロード対応

### 長期的改善
- [ ] カスタムテンプレート対応
- [ ] 翻訳機能の追加
- [ ] Web UIの提供
- [ ] CI/CD統合サポート

## メンテナンス時の注意点

### 依存関係更新
- Commander.js, YAML, Chalkの最新版を定期チェック
- TypeScriptバージョンの互換性確認

### 型定義の管理
- Terraform schema形式の変更に注意
- 新しい属性タイプのサポート追加

### テスト
- 主要プロバイダー（AWS, Azure, GCP）での動作確認
- エッジケースのテスト（空のschema, 巨大なschemaなど）

---

**最終更新**: 2025年11月15日
**次回メンテナンス推奨**: 3ヶ月後（依存関係更新チェック）
