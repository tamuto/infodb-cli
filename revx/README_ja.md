# @infodb/revx

**複数のViteプロジェクトを単一ポートで統合ルーティング**

モノレポ開発に最適 - すべてのViteアプリ、バックエンドAPI、その他の開発サーバーをネイティブHMRサポートと共に実行できます。

## なぜrevx？

複数のViteプロジェクトを持つモノレポでの開発は大変です：
- 各Viteアプリが異なるポートで動作（3000、3001、3002...）
- アプリ間のナビゲーションにハードコードされたポートが必要
- Cookie/セッションの共有が複雑
- CORS問題があちこちで発生

**revxはこれを解決します** - Viteのミドルウェアモードを使用して、パスベースのルーティングで全てを1つのポートでホストします：

```
http://localhost:3000/app1   → Viteプロジェクト1（ネイティブHMR）
http://localhost:3000/app2   → Viteプロジェクト2（ネイティブHMR）
http://localhost:3000/api    → バックエンドAPI
http://localhost:3000/legacy → webpack開発サーバー（プロキシ経由）
```

## 機能

- **🎯 主要機能：マルチViteホスティング** - 完全なHMRサポート付きのネイティブVite統合
- **🔌 リバースプロキシ** - webpack、Parcel、またはその他の開発サーバーを統合
- **📁 静的ファイル配信** - ビルド済みアセットやドキュメントを配信
- **🎨 YAML設定** - シンプルで宣言的なルーティング
- **⚡ 自動ルート並び替え** - 具体性に基づいてルートを優先順位付け
- **🌐 CORS & 環境変数** - クロスオリジンと設定の完全制御

## インストール

### オプション1：開発依存関係としてインストール（推奨）

```bash
npm install -D @infodb/revx
# または
pnpm add -D @infodb/revx
```

次に、package.jsonのscriptsに追加：
```json
{
  "scripts": {
    "dev": "revx start",
    "dev:verbose": "revx start --verbose"
  }
}
```

### オプション2：npx/pnpxで使用（インストール不要）

```bash
npx @infodb/revx start
# または
pnpx @infodb/revx start
```

revxを試すのに適していますが、繰り返し実行すると遅くなります。

### オプション3：グローバルインストール

```bash
npm install -g @infodb/revx
# または
pnpm add -g @infodb/revx
```

## クイックスタート

1. モノレポにrevxをインストール：

```bash
pnpm add -D @infodb/revx
```

2. 設定ファイルを作成：

```bash
pnpm revx init
```

これにより、Viteマルチプロジェクト設定を含む`revx.yaml`ファイルが作成されます。

3. `revx.yaml`を編集してViteプロジェクトを指定：

```yaml
server:
  port: 3000
  maxSockets: 512  # Viteのパフォーマンスに重要

routes:
  # Viteアプリ
  - path: "/app1"
    vite:
      root: "./apps/app1"
      base: "/app1"

  - path: "/app2"
    vite:
      root: "./apps/app2"
      base: "/app2"

  # バックエンドAPI
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""
```

4. 統合開発サーバーを起動：

```bash
pnpm revx start
# または、package.jsonのscriptsに追加して実行：pnpm dev
```

これで、すべてのアプリが完全なHMRと共に`http://localhost:3000`で利用可能になります！🎉

## コマンド

### `revx start [config-file]`

リバースプロキシサーバーを起動します。

```bash
# デフォルトの設定ファイル（revx.yaml）を使用
revx start

# カスタム設定ファイルを使用
revx start my-proxy.yaml

# 詳細出力
revx start --verbose
```

### `revx validate <config-file>`

設定ファイルを検証します。

```bash
revx validate revx.yaml

# 詳細な検証情報を表示
revx validate revx.yaml --verbose
```

### `revx init`

サンプル設定ファイルを作成します。

```bash
# デフォルト設定を作成
revx init

# シンプルな設定を作成
revx init --simple

# 出力ファイルを指定
revx init --output my-config.yaml
```

## ドキュメント

- **[設定リファレンス](./docs/CONFIGURATION.md)** - 詳細な設定オプションとパフォーマンスチューニング
- **[使用例](./docs/EXAMPLES.md)** - 様々なユースケースの実用的な設定例
- **[トラブルシューティング](./docs/TROUBLESHOOTING.md)** - よくある問題と解決策

## 開発

```bash
# リポジトリをクローン
git clone https://github.com/tamuto/infodb-cli
cd infodb-cli/revx

# 依存関係をインストール
pnpm install

# ビルド
pnpm build

# 開発モード
pnpm dev
```

## ライセンス

MIT

## 作者

tamuto <tamuto@infodb.jp>

## リンク

- [GitHubリポジトリ](https://github.com/tamuto/infodb-cli)
- [問題を報告](https://github.com/tamuto/infodb-cli/issues)
