# lctl - Lambda Control Tool

## プロジェクト概要

AWS Lambda関数を簡単に管理するためのCLIツール。内部的にバッシュスクリプトを生成してAWS CLIを呼び出し、Lambda関数の作成、更新、削除を行います。

## 技術仕様

### アーキテクチャ
- **言語**: TypeScript
- **ランタイム**: Node.js 16+
- **CLI Framework**: Commander.js
- **設定管理**: YAML
- **ファイル操作**: Node.js fs/promises
- **ZIP作成**: Archiver
- **AWS操作**: 生成されたバッシュスクリプト経由でAWS CLI実行

### 主要コンポーネント

#### 1. コマンド (`src/commands/`)
- `deploy.ts`: Lambda関数のデプロイ（作成・更新）
- `delete.ts`: Lambda関数の削除  
- `info.ts`: Lambda関数の詳細情報表示
- `export.ts`: デプロイメントスクリプトの出力

#### 2. ユーティリティ (`src/utils/`)
- `config.ts`: YAML設定ファイルの読み込みと変数展開
- `script-generator.ts`: バッシュスクリプト生成
- `logger.ts`: カラフルなログ出力
- `aws-cli.ts`: AWS CLI実行（info コマンドのみで使用）
- `zip.ts`: ZIP ファイル作成（現在未使用、スクリプト内でzip コマンド実行）

### 設定システム

#### YAML設定ファイル
ファイル名: `<function-name>.yaml`

```yaml
# Lambda 基本設定
runtime: python3.12
handler: my-function.handler
role: arn:aws:iam::123456789012:role/lambda-execution-role
architecture: x86_64
memory: 256
timeout: 30
description: "Lambda関数の説明"

# ファイル指定
files:
  - src/
  - requirements.txt
  - "lib/**/*.py"

# 環境変数
environment:
  DB_HOST: $db_host
  API_KEY: ${API_KEY}

# AWS Lambda 高度な設定
layers:
  - arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1
vpc:
  subnets:
    - subnet-12345678
  security_groups:
    - sg-12345678
tags:
  Environment: production

# デプロイメント設定
log_retention_days: 7
auto_create_log_group: true
zip_excludes:
  - "*.git*"
  - "node_modules/*"
  - "*.zip"
```

#### 変数展開システム
1. **パラメータ変数**: `$key` - `--params key=value` で指定
2. **環境変数**: `${VAR_NAME}` - プロセス環境変数から取得
3. **優先順位**: パラメータ変数 > 環境変数

### スクリプト生成システム

deployコマンド実行時の流れ：
1. YAML設定読み込み
2. 変数展開（params、環境変数）
3. バッシュスクリプト生成
4. スクリプト実行
5. 一時ファイル削除

生成されるスクリプトの特徴：
- 関数存在チェック（create vs update）
- ZIP作成（YAML files 設定に基づく）
- 環境変数、レイヤー、VPC等の設定
- ロググループ作成＆保持期間設定
- jq による結果整形

### 開発環境

#### 必要なツール
- Node.js 16+
- TypeScript
- AWS CLI v2
- jq（JSON整形用）

#### 開発コマンド
```bash
cd lctl
npm install          # 依存関係インストール
npm run dev          # 開発実行
npm run build        # ビルド
npm run watch        # watch モード
npm run lint         # ESLint
npm run format       # Prettier
```

#### プロジェクト構造
```
lctl/
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── README.md
├── CLAUDE.md
└── src/
    ├── index.ts              # メインエントリーポイント
    ├── commands/
    │   ├── deploy.ts
    │   ├── delete.ts
    │   ├── info.ts
    │   └── export.ts
    └── utils/
        ├── config.ts
        ├── script-generator.ts
        ├── logger.ts
        ├── aws-cli.ts
        └── zip.ts
```

## 使用例

### 基本的な使用方法
```bash
# YAML設定ファイルを使用したデプロイ
pnpx @infodb/lctl deploy my-function

# パラメータ付きデプロイ
pnpx @infodb/lctl deploy my-function --params env=prod --params db_host=prod.example.com

# スクリプト出力
pnpx @infodb/lctl export my-function --output deploy-script.sh

# 関数削除
pnpx @infodb/lctl delete my-function

# 関数情報表示
pnpx @infodb/lctl info my-function
```

### サンプルYAML設定
```yaml
# my-function.yaml
runtime: python3.12
handler: my-function.handler
role: arn:aws:iam::123456789012:role/lambda-execution-role-$env

files:
  - src/
  - requirements.txt

environment:
  DB_HOST: $db_host
  ENV: $env

log_retention_days: 14
zip_excludes:
  - "*.pyc"
  - "__pycache__/*"
  - ".pytest_cache/*"
```

### 実行例
```bash
# 開発環境デプロイ
pnpx @infodb/lctl deploy my-function --params env=dev --params db_host=localhost

# 本番環境デプロイ
pnpx @infodb/lctl deploy my-function --params env=prod --params db_host=prod.db.example.com
```

## トラブルシューティング

### よくある問題
1. **AWS CLI not found**: AWS CLI v2がインストールされていることを確認
2. **権限エラー**: 適切なIAMロールとポリシーが設定されていることを確認
3. **YAML構文エラー**: YAML ファイルの構文を確認
4. **環境変数が見つからない**: `${VAR_NAME}` で参照する環境変数が設定されていることを確認

### デバッグ
```bash
# 詳細ログ出力
pnpx @infodb/lctl deploy my-function --verbose

# スクリプト出力してデバッグ
pnpx @infodb/lctl export my-function --output debug-script.sh
bash debug-script.sh
```