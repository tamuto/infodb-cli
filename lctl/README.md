# lctl - Lambda Control Tool

## 概要
AWS Lambda関数を簡単に管理するためのCLIツール。YAML設定ファイルによる設定管理と、内部的なAWS CLIを使用したLambda関数の作成、更新、削除を行います。

## インストール・実行方法
```bash
pnpx @infodb/lctl [コマンド] [設定ファイル名] [オプション]
```

## 基本的な使用方法

### 1. プロジェクト構成を作成
```
project/
├── configs/                # 設定ファイル（必須）
│   ├── my-function.yaml
│   └── other-function.yaml
├── functions/              # Lambda関数コード（必須）
│   ├── my-function.py
│   └── utils.py
└── lambda-function.zip     # 生成されるデプロイパッケージ
```

### 2. YAML設定ファイルを作成
`configs/my-function.yaml`:
```yaml
# 基本設定
function_name: my_function  # 実際のLambda関数名
runtime: python3.12
handler: my_function.handler
role: arn:aws:iam::123456789012:role/lambda-execution-role

# ファイル設定
files:
  - my_function.py
  - utils.py

# Python依存関係（自動インストール）
requirements:
  - requests>=2.28.0
  - boto3>=1.26.0

# 環境変数
environment:
  ENV: production

# 権限設定
permissions:
  - service: apigateway
    source_arn: "arn:aws:execute-api:us-east-1:123456789012:*"
```

### 3. デプロイ実行
```bash
# 一括デプロイ（推奨）
pnpx @infodb/lctl deploy my-function

# または個別実行
pnpx @infodb/lctl makezip my-function    # ZIPパッケージ作成
pnpx @infodb/lctl export my-function     # スクリプト生成
bash deploy-my-function.sh               # デプロイ実行
```

## コマンド一覧

### 1. makezip - デプロイパッケージの作成
```bash
pnpx @infodb/lctl makezip <config-name> [オプション]
```

**必須引数:**
- `config-name`: 設定ファイル名（.yaml拡張子は不要）

**オプション:**
- `--verbose`: 詳細なログを出力

**機能:**
- `requirements`セクションがあれば自動的にpip installを実行
- 既存のvendorフォルダを削除
- 適切なディレクトリ構造で`lambda-function.zip`を作成

**例:**
```bash
pnpx @infodb/lctl makezip my-function --verbose
```

### 2. deploy - Lambda関数の完全デプロイ（推奨）
```bash
pnpx @infodb/lctl deploy <config-name> [オプション]
```

**必須引数:**
- `config-name`: 設定ファイル名（.yaml拡張子は不要）

**オプション:**
- `--verbose`: 詳細なログを出力

**動作:**
1. `makezip`コマンドを自動実行（ZIPパッケージ作成）
2. `export`コマンドを自動実行（デプロイスクリプト生成）
3. 生成されたスクリプトを実行（AWS Lambda関数デプロイ）

**例:**
```bash
# 基本的な使用方法
pnpx @infodb/lctl deploy my-function

# 詳細ログ付き
pnpx @infodb/lctl deploy my-function --verbose
```

### 3. export - デプロイスクリプトの生成
```bash
pnpx @infodb/lctl export <config-name> [オプション]
```

**必須引数:**
- `config-name`: 設定ファイル名（.yaml拡張子は不要）

**オプション:**
- `--output <file>`: 出力ファイルパス（デフォルト: deploy-{config-name}.sh）
- `--verbose`: 詳細なログを出力

**機能:**
- `lambda-function.zip`の存在チェックを含むスクリプトを生成
- CI/CD環境で個別実行するのに適している

**例:**
```bash
# スクリプト生成
pnpx @infodb/lctl export my-function

# カスタム出力ファイル
pnpx @infodb/lctl export my-function --output custom-deploy.sh
```

### 4. delete - Lambda関数の削除
```bash
pnpx @infodb/lctl delete <config-name> [オプション]
```

**必須引数:**
- `config-name`: 設定ファイル名（.yaml拡張子は不要）

**オプション:**
- `--verbose`: 詳細なログを出力

**例:**
```bash
pnpx @infodb/lctl delete my-function
```

### 5. info - Lambda関数の詳細情報表示
```bash
pnpx @infodb/lctl info <config-name> [オプション]
```

**必須引数:**
- `config-name`: 設定ファイル名（.yaml拡張子は不要）

**オプション:**
- `--verbose`: 詳細なログを出力

**例:**
```bash
pnpx @infodb/lctl info my-function
```

## 使用シナリオ

### ローカル開発
```bash
# 一括デプロイ（最も簡単）
pnpx @infodb/lctl deploy my-function
```

### CI/CD環境
```bash
# 段階的デプロイ（制御しやすい）
pnpx @infodb/lctl makezip my-function    # ZIPパッケージ作成
pnpx @infodb/lctl export my-function     # スクリプト生成
bash deploy-my-function.sh               # デプロイ実行
```

### レガシーコマンド（v0.8.0以前との互換性）

#### export - デプロイメントスクリプトの出力
```bash
pnpx @infodb/lctl export <config-name> [オプション]
```

**必須引数:**
- `config-name`: 設定ファイル名（.yaml拡張子は不要）

**オプション:**
- `--output <file>`: 出力ファイルパス（デフォルト: deploy-{config-name}.sh）
- `--verbose`: 詳細なログを出力

**例:**
```bash
# スクリプト出力
pnpx @infodb/lctl export my-function --output deploy-script.sh

# 環境変数を使用してスクリプト出力
ENV_NAME=prod DB_HOST=prod.example.com pnpx @infodb/lctl export my-function
```

## YAML設定ファイル（必須）

設定ファイルは `configs/` ディレクトリに配置し、`configs/<config-name>.yaml` 形式で命名します。

### 基本的な設定例

```yaml
# configs/my-function.yaml

# 関数名設定（オプション）
function_name: ${ENV_NAME}_my_function  # 環境変数を使用した動的命名
# function_name: my_function             # 固定名
# 未設定の場合、設定ファイル名（my-function）を使用

# 基本設定
runtime: python3.12
handler: my_function.handler
role: arn:aws:iam::123456789012:role/lambda-execution-role
architecture: x86_64  # x86_64 または arm64
memory: 256
timeout: 30
description: "マイ Lambda 関数"

# デプロイするファイル（functionsディレクトリ内の相対パス）
files:
  - my_function.py
  - utils.py
  - "lib/**/*.py"  # glob パターンも使用可能

# Python依存関係（自動インストール）
requirements:
  - requests>=2.28.0
  - boto3>=1.26.0
  - pandas>=1.5.0

# 環境変数
environment:
  DB_HOST: ${DB_HOST}
  DB_PORT: ${DB_PORT}
  API_KEY: ${API_KEY}
  ENV: ${ENV_NAME}

# 権限設定（外部サービスからの呼び出し許可）
permissions:
  - service: apigateway
    source_arn: "arn:aws:execute-api:us-east-1:123456789012:*"
    statement_id: "api-gateway-invoke"
  - service: events
    source_arn: "arn:aws:events:us-east-1:123456789012:rule/my-rule"
    statement_id: "eventbridge-invoke"

# ログ設定
log_retention_days: 14         # ログ保持期間（日）
auto_create_log_group: true    # ロググループ自動作成

# ZIP除外設定
zip_excludes:                  # ZIP化時の除外パターン
  - "*.git*"
  - "node_modules/*"
  - "*.zip"
  - "*.pyc"
  - "__pycache__/*"

# タグ
tags:
  Environment: ${ENV_NAME}
  Team: backend
  Project: my-project
```

### 高度な設定例

```yaml
# 高度な設定
reserved_concurrency: 100
provisioned_concurrency: 10
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
```

### 権限設定（permissions）

外部サービスやIAMユーザー・ロールからLambda関数を呼び出すための権限を自動設定します。

#### サービス別の権限設定
```yaml
permissions:
  - service: apigateway              # API Gateway
    source_arn: "arn:aws:execute-api:region:account:api-id/*"
  - service: events                  # EventBridge
    source_arn: "arn:aws:events:region:account:rule/rule-name"
  - service: sns                     # SNS
    source_arn: "arn:aws:sns:region:account:topic-name"
  - service: s3                      # S3
    source_arn: "arn:aws:s3:::bucket-name"
  - service: elasticloadbalancing    # ALB
    source_arn: "arn:aws:elasticloadbalancing:region:account:targetgroup/name"
```

#### IAMユーザー・ロールの直接指定
```yaml
permissions:
  - principal: "arn:aws:iam::123456789012:user/MyUser"
    statement_id: "allow-my-user"
    action: "lambda:InvokeFunction"
  - principal: "arn:aws:iam::123456789012:role/MyRole"
    statement_id: "allow-my-role"
  - principal: "123456789012"          # AWS Account ID
    statement_id: "allow-account"
```

#### 混合設定例
```yaml
permissions:
  # サービス別設定（principalは自動設定）
  - service: apigateway
    source_arn: "arn:aws:execute-api:region:account:api-id/*"
    statement_id: "api-gateway-invoke"
  
  # IAMユーザー直接指定
  - principal: "arn:aws:iam::123456789012:user/DeployUser"
    statement_id: "deploy-user-invoke"
    action: "lambda:InvokeFunction"
  
  # IAMロール直接指定
  - principal: "arn:aws:iam::123456789012:role/CrossAccountRole"
    statement_id: "cross-account-invoke"
    source_arn: "arn:aws:iam::123456789012:role/CrossAccountRole"
```

**注意**: `service` または `principal` のどちらか一方を必ず指定してください。両方指定した場合は `principal` が優先されます。

### 環境変数による動的設定

```yaml
# 環境変数を使用した設定
function_name: ${ENV_NAME}_my_function
role: arn:aws:iam::123456789012:role/lambda-role-${ENV_NAME}
environment:
  DB_HOST: ${DB_HOST}
  ENV: ${ENV_NAME}
tags:
  Environment: ${ENV_NAME}
```

実行時に環境変数を設定：
```bash
ENV_NAME=prod DB_HOST=prod.example.com pnpx @infodb/lctl deploy my-function
```

## 環境要件

- Node.js 16以上
- AWS CLI v2がインストールされていること
- 適切なAWS認証情報が設定されていること
- `configs/` と `functions/` ディレクトリが存在すること

## AWS認証情報の設定

以下のいずれかの方法でAWS認証情報を設定してください：

1. AWS CLIによる設定：
```bash
aws configure
```

2. 環境変数による設定：
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

3. IAMロールの使用（EC2、Lambda等）

## トラブルシューティング

### よくある問題
1. **AWS CLI not found**: AWS CLI v2がインストールされていることを確認
2. **権限エラー**: 適切なIAMロールとポリシーが設定されていることを確認
3. **YAML設定ファイルが見つからない**: `configs/<config-name>.yaml` が存在することを確認
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