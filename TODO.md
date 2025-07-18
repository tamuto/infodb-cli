# lctl ツール仕様整理・ブラッシュアップ TODO

## 現在の仕様分析

### 既存機能
- **基本コマンド**: `deploy`, `delete`, `info`, `export`
- **設定システム**: YAML設定ファイル（`configs/{function-name}.yaml`）
- **変数展開**: `${ENV_VAR}` 形式の環境変数置換
- **スクリプト生成**: Bash スクリプト生成・実行によるデプロイ
- **ファイル管理**: `files` 配列による包含ファイル指定

### 主要な改善要件

## 1. 関数名の設定機能追加
**現在**: 関数名はCLI引数がそのまま Lambda 関数名として使用
**新仕様**: YAML内で関数名を設定可能、未設定時はファイル名をデフォルト使用

### 実装方針
- [ ] YAML設定ファイルを**必須**とする（現在はオプション）
- [ ] YAML内に `function_name` フィールドを追加（オプション）
- [ ] 環境変数を使用した動的関数名生成対応: `${ENV_NAME}_関数名`
- [ ] function_name 未設定時は設定ファイル名をデフォルト使用
- [ ] 設定例:
  ```yaml
  # カスタム関数名を指定する場合
  function_name: ${ENV_NAME}_my_function
  role: arn:aws:iam::123456789012:role/lambda-execution-role
  runtime: python3.12
  handler: my_function.handler
  ```
  ```yaml
  # function_name 未設定時は設定ファイル名（my_function）を使用
  role: arn:aws:iam::123456789012:role/lambda-execution-role
  runtime: python3.12
  handler: my_function.handler
  ```

### 関連ファイル修正
- [ ] `src/utils/config.ts`: YAML必須化、function_name フィールド追加
- [ ] `src/commands/deploy.ts`: 関数名取得方法変更
- [ ] `src/commands/export.ts`: 関数名取得方法変更
- [ ] `src/commands/delete.ts`: 関数名取得方法変更
- [ ] `src/commands/info.ts`: 関数名取得方法変更

## 2. add-permission 条件追加
**目的**: リソースベースポリシー設定によるアクセス権限問題の解決

### 実装方針
- [ ] スクリプト生成時に add-permission コマンドを追加
- [ ] 設定オプションで有効/無効を制御
- [ ] 一般的なサービス（API Gateway、ALB、EventBridge等）への権限付与

### YAML設定例
```yaml
permissions:
  - service: apigateway
    source_arn: "arn:aws:execute-api:region:account:api-id/*"
  - service: events
    source_arn: "arn:aws:events:region:account:rule/rule-name"
```

### 関連ファイル修正
- [ ] `src/utils/config.ts`: permissions フィールド追加
- [ ] `src/utils/script-generator.ts`: add-permission セクション追加

## 3. 設定管理の改善

### YAML必須化
- [ ] 設定ファイルの必須チェック実装
- [ ] エラーメッセージの改善
- [ ] デフォルト値の見直し

### 関数名管理
- [ ] CLI引数の関数名 → 設定ファイル名の特定に使用
- [ ] 実際のLambda関数名 → YAML内の `function_name` を使用（未設定時はファイル名）

## 4. CLI インターフェース調整

### コマンド引数の変更
```bash
# 現在
lctl deploy my-function

# 新仕様（引数は設定ファイル名として使用）
lctl deploy my-function  # configs/my-function.yaml を読み込み
                        # 実際の関数名は YAML内の function_name を使用
                        # function_name 未設定時は "my-function" を使用
```

### 関連ファイル修正
- [ ] `src/index.ts`: ヘルプメッセージ更新
- [ ] 各コマンドファイル: 関数名取得ロジック変更

## 5. エラーハンドリング強化

### 新しいエラーケース
- [ ] YAML設定ファイルが存在しない
- [ ] function_name フィールドが未定義
- [ ] 環境変数が未定義（${ENV_NAME} 展開失敗）

### 関連ファイル修正
- [ ] `src/utils/config.ts`: エラーハンドリング追加
- [ ] 各コマンドファイル: エラーメッセージ改善

## 6. サンプル・ドキュメント更新

### サンプルファイル
- [ ] `lctl/sample/configs/test_lambda.yaml`: 新仕様に対応
- [ ] 環境変数を使用した設定例追加

### ドキュメント
- [ ] `CLAUDE.md`: 仕様変更の反映
- [ ] `README.md`: 使用例更新

## 7. 後方互換性の考慮

### 移行方針
- [ ] 現在のオプション YAML → 必須 YAML への移行パス
- [ ] 警告メッセージによる段階的移行
- [ ] 既存設定ファイルの自動変換ツール（必要に応じて）

## 8. テスト・検証

### 新機能テスト
- [ ] 環境変数展開の動作確認
- [ ] add-permission コマンドの動作確認
- [ ] エラーケースの動作確認

### 既存機能の回帰テスト
- [ ] 基本的なデプロイ動作
- [ ] export コマンドの動作
- [ ] 複雑な設定（VPC、Layer等）の動作

## 実装状況

### ✅ Phase 1: 基本機能実装（完了）
1. ✅ YAML必須化
2. ✅ function_name フィールド追加
3. ✅ 環境変数展開対応
4. ✅ コマンドラインオプション簡素化
5. ✅ フォルダ名固定化（configs/functions）

### ✅ Phase 2: 権限管理機能（完了）
1. ✅ add-permission 設定追加
2. ✅ スクリプト生成時の権限設定
3. ✅ 主要サービスの principal 自動設定

### ✅ Phase 3: 完成度向上（完了）
1. ✅ エラーハンドリング強化
2. ✅ ドキュメント更新
3. ✅ サンプル更新

## 実装完了した機能

### 新機能
- **YAML設定ファイル必須化**: 設定の一元管理
- **function_name 設定**: カスタム関数名の指定、環境変数による動的生成
- **add-permission サポート**: 外部サービスからの呼び出し権限設定
- **コマンドライン簡素化**: 不要なオプション削除
- **フォルダ構造固定**: configs/ と functions/ の固定化

### 改善点
- エラーメッセージの向上
- 設定ファイルの詳細な例示
- 権限設定の自動化

## 注意事項

### 破壊的変更
- ✅ YAML設定ファイルが必須になる
- ✅ 関数名の決定方法が変わる
- ✅ コマンドラインオプションが簡素化される
- ✅ フォルダ名が固定化される

### 移行が必要な点
- 既存の設定をYAMLファイルに移行
- コマンドライン引数の調整
- フォルダ構造の調整（configs/、functions/）