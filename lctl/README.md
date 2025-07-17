# lctl - Lambda Control Tool

## 概要
AWS Lambda関数を簡単に管理するためのCLIツール。内部的にAWS CLIを呼び出してLambda関数の作成、更新、削除を行う。

## インストール・実行方法
```bash
pnpx @infodb/lctl [コマンド] [関数名] [オプション]
```

## コマンド一覧

### 1. deploy - Lambda関数のデプロイ（作成・更新）
```bash
pnpx @infodb/lctl deploy <function-name> [オプション]
```

関数が存在しない場合は作成し、存在する場合は更新します。

**設定の優先順位:**
1. コマンドラインオプション (最優先)
2. `configs/<function-name>.yaml` 設定ファイル
3. デフォルト値

**必須引数:**
- `function-name`: デプロイするLambda関数名

**オプション:**
- `--runtime <runtime>`: ランタイム環境 (デフォルト: python3.12)
- `--handler <handler>`: ハンドラー関数 (デフォルト: {function-name}.handler)
- `--role <role-arn>`: IAMロールARN (新規作成時に必須)
- `--config <directory>`: 設定ファイルのディレクトリ (デフォルト: configs)
- `--function <directory>`: 関数ファイルのディレクトリ (デフォルト: functions)

**例:**
```bash
# 最もシンプルな使用方法（functionsディレクトリのファイルを自動ZIP化）
pnpx @infodb/lctl deploy my-function --role arn:aws:iam::123456789012:role/lambda-role

# YAML設定ファイルを使用（推奨）
pnpx @infodb/lctl deploy my-function  # configs/my-function.yaml から設定を読み込み

# 環境変数を使ってフレキシブルなデプロイ
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/lambda-role ENV=prod pnpx @infodb/lctl deploy my-function

# カスタム設定ディレクトリを使用
pnpx @infodb/lctl deploy my-function --config environments/prod

# カスタム関数ディレクトリを使用
pnpx @infodb/lctl deploy my-function --function src
```

### 2. delete - Lambda関数の削除
```bash
pnpx @infodb/lctl delete <function-name>
```

**必須引数:**
- `function-name`: 削除するLambda関数名

**例:**
```bash
pnpx @infodb/lctl delete my-function
```

### 3. info - Lambda関数の詳細情報表示
```bash
pnpx @infodb/lctl info <function-name>
```

**必須引数:**
- `function-name`: 情報を表示するLambda関数名

**例:**
```bash
pnpx @infodb/lctl info my-function
```

### 4. export - デプロイメントスクリプトの出力
```bash
pnpx @infodb/lctl export <function-name> [オプション]
```

デプロイ用のバッシュスクリプトを生成して保存します。

**必須引数:**
- `function-name`: Lambda関数名

**オプション:**
- `--runtime <runtime>`: ランタイム環境 (デフォルト: python3.12)
- `--handler <handler>`: ハンドラー関数 (デフォルト: {function-name}.handler)
- `--role <role-arn>`: IAMロールARN (新規作成時に必須)
- `--config <directory>`: 設定ファイルのディレクトリ (デフォルト: configs)
- `--function <directory>`: 関数ファイルのディレクトリ (デフォルト: functions)
- `--output <file>`: 出力ファイルパス (デフォルト: deploy-{function-name}.sh)
- `--region <region>`: AWSリージョン
- `--profile <profile>`: AWSプロファイル
- `--verbose`: 詳細なログを出力

**例:**
```bash
# スクリプト出力
pnpx @infodb/lctl export my-function --output deploy-script.sh

# 環境変数を使用してスクリプト出力
ENV=prod DB_HOST=prod.example.com pnpx @infodb/lctl export my-function
```

## グローバルオプション
- `--region <region>`: AWSリージョンを指定 (デフォルト: 環境変数またはAWS設定)
- `--profile <profile>`: AWSプロファイルを指定
- `--help, -h`: ヘルプを表示
- `--version, -v`: バージョンを表示
- `--verbose`: 詳細なログを出力

## 環境要件
- Node.js 16以上
- AWS CLI v2がインストールされていること
- 適切なAWS認証情報が設定されていること

## プロジェクト構成

推奨されるプロジェクト構成：

```
project/
├── configs/                # 設定ファイル
│   ├── my-function.yaml
│   └── other-function.yaml
├── functions/              # Lambda関数コード
│   ├── my-function.py
│   ├── requirements.txt
│   └── utils.py
└── other-files/
```

## YAML設定ファイル

設定ファイルは `configs/` ディレクトリ（デフォルト）から自動的に読み込まれます。  
Lambda関数のコードは `functions/` ディレクトリ（デフォルト）から読み込まれます。

### ファイル名の規則
- `configs/<function-name>.yaml` (例: `configs/my-function.yaml`)
- `--config` オプションでディレクトリを変更可能
- `--function` オプションで関数ディレクトリを変更可能

### YAML設定例

```yaml
# my-function.yaml
runtime: python3.12
handler: my-function.handler
role: ${AWS_ROLE_ARN}
architecture: x86_64  # x86_64 または arm64
memory: 256
timeout: 30
description: "マイ Lambda 関数"

# 依存ファイルの指定（functionsディレクトリ内の相対パス）
files:
  - my-function.py
  - requirements.txt
  - utils.py
  - "lib/**/*.py"  # glob パターンも使用可能

# 環境変数
environment:
  DB_HOST: ${DB_HOST}
  DB_PORT: ${DB_PORT}
  API_KEY: ${API_KEY}
  ENV: ${ENV}

# ログ設定
log_retention_days: 7          # ログ保持期間（日）
auto_create_log_group: true    # ロググループ自動作成

# ZIP除外設定
zip_excludes:                  # ZIP化時の除外パターン
  - "*.git*"
  - "node_modules/*"
  - "*.zip"
  - "dist/*"
  - ".DS_Store"

# リザーブド同時実行数
reserved_concurrency: 100

# プロビジョンド同時実行設定
provisioned_concurrency: 10

# エフェメラルストレージ
ephemeral_storage: 1024  # MB (512-10240)

# レイヤー
layers:
  - arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1
  - arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:14

# VPC設定
vpc:
  subnets:
    - subnet-12345678
    - subnet-87654321
  security_groups:
    - sg-12345678

# デッドレターキュー
dead_letter_queue:
  target_arn: arn:aws:sqs:us-east-1:123456789012:my-dlq

# タグ
tags:
  Environment: production
  Team: backend
  Project: my-project
```

### YAML設定項目

| 項目 | 型 | 説明 | 例 |
|------|----|----|-----|
| `runtime` | string | ランタイム環境 | `python3.12`, `nodejs18.x` |
| `handler` | string | ハンドラー関数 | `my-function.handler`, `app.lambda_handler` |
| `role` | string | IAMロールARN | `arn:aws:iam::123456789012:role/...` |
| `architecture` | string | アーキテクチャ | `x86_64`, `arm64` |
| `memory` | number | メモリサイズ(MB) | `128`, `256`, `512` |
| `timeout` | number | タイムアウト時間(秒) | `3`, `30`, `900` |
| `description` | string | 関数の説明 | `"マイ Lambda 関数"` |
| `reserved_concurrency` | number | リザーブド同時実行数 | `100`, `1000` |
| `provisioned_concurrency` | number | プロビジョンド同時実行 | `10`, `50` |
| `ephemeral_storage` | number | エフェメラルストレージ(MB) | `512`, `1024`, `10240` |
| `files` | array | 含めるファイル・ディレクトリ | `["src/", "*.py"]` |
| `environment` | object | 環境変数 | `{DB_HOST: "localhost"}` |
| `log_retention_days` | number | ログ保持期間（日） | `7`, `14`, `30` |
| `auto_create_log_group` | boolean | ロググループ自動作成 | `true`, `false` |
| `zip_excludes` | array | ZIP化時の除外パターン | `["*.git*", "node_modules/*"]` |
| `layers` | array | レイヤーARN | `["arn:aws:lambda:..."]` |
| `vpc` | object | VPC設定 | `{subnets: [...], security_groups: [...]}` |
| `dead_letter_queue` | object | DLQ設定 | `{target_arn: "arn:aws:sqs:..."}` |
| `tags` | object | タグ | `{Environment: "prod"}` |

### ファイル処理の仕組み

1. YAMLファイルの `files` に指定されたファイル・ディレクトリを自動的にZIP化
2. YAMLファイルがない場合は、カレントディレクトリの全ファイルをZIP化
3. glob パターンをサポート（`**/*.py`, `src/**/*` など）
4. 一時的なZIPファイルを作成してデプロイ後に削除

### 変数の展開

**環境変数の展開:**
- `${VAR_NAME}` 形式で現在の環境変数を参照可能
- 存在しない環境変数を参照した場合はエラー

**環境変数を使用した環境管理:**
```bash
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/lambda-role ENV=prod pnpx @infodb/lctl deploy my-function
```

## エラーハンドリング
- AWS CLIコマンドが失敗した場合、適切なエラーメッセージを表示
- 必須パラメータが不足している場合、使用方法を表示
- 存在しない関数に対する操作の場合、エラーメッセージを表示
- YAML設定ファイルの構文エラーがある場合、詳細なエラーメッセージを表示