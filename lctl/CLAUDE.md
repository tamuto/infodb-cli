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

#### YAML設定ファイル（必須）
ファイル名: `configs/<function-name>.yaml`

```yaml
# Lambda 基本設定
function_name: ${ENV_NAME}_my_function  # Optional: カスタム関数名
runtime: python3.12
handler: my_function.handler
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
  DB_HOST: ${DB_HOST}
  API_KEY: ${API_KEY}

# 権限設定
permissions:
  # AWS Service permissions
  - service: apigateway
    source_arn: "arn:aws:execute-api:region:account:api-id/*"
  - service: events
    source_arn: "arn:aws:events:region:account:rule/rule-name"
  
  # IAM User/Role direct permissions
  - principal: "arn:aws:iam::123456789012:user/DeployUser"
    statement_id: "deploy-user-invoke"
  - principal: "arn:aws:iam::123456789012:role/CrossAccountRole"
    statement_id: "cross-account-invoke"

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
1. **環境変数**: `${VAR_NAME}` - プロセス環境変数から取得
2. **関数名**: `function_name` 未設定時は設定ファイル名を使用

### スクリプト生成システム

deployコマンド実行時の流れ：
1. YAML設定読み込み（必須）
2. 変数展開（環境変数）
3. バッシュスクリプト生成
4. スクリプト実行
5. 一時ファイル削除

生成されるスクリプトの特徴：
- 関数存在チェック（create vs update）
- ZIP作成（YAML files 設定に基づく）
- 環境変数、レイヤー、VPC等の設定
- 権限設定（add-permission）
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
npm run dev          # 開発実行（watch モード）
npm run build        # ビルド
npm run start        # ビルド済みコードを実行
```

#### プロジェクト構造
```
lctl/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
├── bin/
│   └── cli.js               # CLIエントリーポイント
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
# YAML設定ファイルを使用したデプロイ（configs/my-function.yaml が必要）
pnpx @infodb/lctl deploy my-function

# スクリプト出力
pnpx @infodb/lctl export my-function --output deploy-script.sh

# 関数削除
pnpx @infodb/lctl delete my-function

# 関数情報表示
pnpx @infodb/lctl info my-function
```

### サンプルYAML設定
```yaml
# configs/my-function.yaml
function_name: ${ENV_NAME}_my_function  # Optional: custom function name with environment variable
runtime: python3.12
handler: my_function.handler
role: arn:aws:iam::123456789012:role/lambda-execution-role

files:
  - src/
  - requirements.txt

environment:
  DB_HOST: ${DB_HOST}
  ENV: ${ENV_NAME}

# Permissions for external services
permissions:
  - service: apigateway
    source_arn: "arn:aws:execute-api:us-east-1:123456789012:*"
    statement_id: "api-gateway-invoke"
  - service: events
    source_arn: "arn:aws:events:us-east-1:123456789012:rule/my-rule"

log_retention_days: 14
zip_excludes:
  - "*.pyc"
  - "__pycache__/*"
  - ".pytest_cache/*"

tags:
  Environment: ${ENV_NAME}
  Project: my-project
```

### 実行例
```bash
# 環境変数を設定してデプロイ
ENV_NAME=dev DB_HOST=localhost pnpx @infodb/lctl deploy my-function

# 本番環境デプロイ
ENV_NAME=prod DB_HOST=prod.db.example.com pnpx @infodb/lctl deploy my-function
```

## 開発・リリース手順

### バージョン更新手順
新しいバージョンをリリースする際は、以下の2つのファイルでバージョン番号を更新する必要があります：

1. **package.json** - パッケージのバージョン
```bash
# package.jsonのversionフィールドを更新
"version": "0.8.0"
```

2. **src/index.ts** - CLIのversionメソッド
```bash
# src/index.tsの.version()メソッドを更新
.version('0.8.0')
```

#### バージョン更新の実行例
```bash
# 1. package.jsonとsrc/index.tsの両方でバージョンを更新
# 2. 変更をコミット
git add package.json src/index.ts
git commit -m "Bump version to 0.8.0"

# 3. プッシュ
git push
```

## トラブルシューティング

### よくある問題
1. **AWS CLI not found**: AWS CLI v2がインストールされていることを確認
2. **権限エラー**: 適切なIAMロールとポリシーが設定されていることを確認
3. **YAML設定ファイルが見つからない**: `configs/<function-name>.yaml` が存在することを確認
4. **YAML構文エラー**: YAML ファイルの構文を確認
5. **環境変数が見つからない**: `${VAR_NAME}` で参照する環境変数が設定されていることを確認

### デバッグ
```bash
# 詳細ログ出力
pnpx @infodb/lctl deploy my-function --verbose

# スクリプト出力してデバッグ
pnpx @infodb/lctl export my-function --output debug-script.sh
bash debug-script.sh
```