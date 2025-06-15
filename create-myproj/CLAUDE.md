# create-myproj - Claudeメンテナンス用分析ドキュメント

> このファイルは、Claude AIが今後のメンテナンス作業で参照するための内部ドキュメントです。

## 📋 プロジェクト概要

### 基本情報
- **プロジェクト名**: `@infodb/create-myproj`
- **バージョン**: 1.4.0
- **作者**: tamuto <tamuto@infodb.jp>
- **リポジトリ**: https://github.com/tamuto/infodb-cli
- **ライセンス**: MIT

### ツールの目的
Rspackを用いたモダンなReactプロジェクトを瞬時に作成するためのスキャフォールディングツール。TailwindCSS、shadcn/ui、TypeScriptが事前設定された高性能なプロジェクトテンプレートを提供。

## 🏗️ プロジェクト構造分析

```
create-myproj/
├── src/
│   └── index.ts              # メインエントリーポイント（create-rstackベース）
├── bin.js                    # CLIバイナリ（distを呼び出し）
├── dist/                     # ビルド済みファイル（rslibでビルド）
├── template-common/          # 共通テンプレートファイル
│   ├── README.md            # 生成プロジェクト用README
│   └── gitignore            # .gitignoreテンプレート
├── template-react-ts/        # React + TypeScriptテンプレート
│   ├── package.json         # React 19, TailwindCSS 4.x
│   ├── components.json      # shadcn/ui設定（New Yorkスタイル）
│   ├── rsbuild.config.ts    # Rspack設定
│   ├── tailwind.config.js   # TailwindCSS設定
│   └── src/
│       ├── app/App.tsx      # サンプルアプリ
│       ├── lib/utils.ts     # shadcn/ui utilities
│       ├── globals.css      # TailwindCSSディレクティブ
│       └── main.tsx         # エントリーポイント
├── template-tanstack-router/ # TanStack Router付きテンプレート
│   ├── package.json         # react-ts + TanStack Router
│   └── src/
│       ├── routes/          # ファイルベースルーティング
│       │   ├── __root.tsx   # ルートレイアウト
│       │   ├── index.lazy.tsx
│       │   └── about.lazy.tsx
│       └── routeTree.gen.ts # 自動生成ルート定義
├── package.json              # CLIツール本体設定
├── rslib.config.ts          # CLIビルド設定（ESM, Node.js）
├── tsconfig.json            # TypeScript設定
├── README.md                # プロジェクト説明
└── CHANGELOG.md             # バージョン履歴
```

## 🔧 技術スタック詳細

### CLIツール本体
- **ベースライブラリ**: create-rstack v1.0.8
- **ビルドツール**: rslib v0.0.14
- **ランタイム**: Node.js (ESM)
- **言語**: TypeScript 5.6.3

### 生成されるプロジェクト
- **React**: 19.1.0（最新版）
- **ビルドツール**: Rsbuild v1.3.22（Rspackベース）
- **スタイリング**: TailwindCSS v4.1.10
- **UIライブラリ**: shadcn/ui（New Yorkスタイル）
- **アイコン**: Lucide React, Radix UI Icons
- **ユーティリティ**: class-variance-authority, clsx, tailwind-merge

### TanStack Routerテンプレート追加技術
- **ルーター**: TanStack Router v1.121.12
- **開発ツール**: React Router DevTools, Router Plugin

## 📋 利用可能なテンプレート

### 1. react-ts（標準テンプレート）
- **対象**: シンプルなSPA、プロトタイプ、小〜中規模アプリ
- **特徴**: React + TypeScript + TailwindCSS + shadcn/ui
- **ポート**: 8080

### 2. tanstack-router（ルーティング付き）
- **対象**: 複数ページアプリ、大規模フロントエンド
- **特徴**: 上記 + TanStack Router + ファイルベースルーティング
- **開発ツール**: Router DevTools付き

## 🔄 動作フロー

### 1. CLI実行
```bash
pnpm create @infodb/myproj@latest -d my-app
```

### 2. テンプレート選択
- `src/index.ts`の`getTemplateName`関数で処理
- インタラクティブ選択またはコマンドライン引数

### 3. プロジェクト生成
- `create-rstack`ライブラリがテンプレートをコピー
- `template-common`と選択されたテンプレートをマージ
- `.npmignore`をスキップ

## 🎨 shadcn/ui設定詳細

### components.json設定
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  },
  "iconLibrary": "lucide"
}
```

## 🚀 ビルド・デプロイ設定

### 開発時
- **コマンド**: `pnpm dev`
- **ポート**: 8080（デフォルト）
- **ホットリロード**: 有効

### プロダクション
- **ビルド**: `pnpm build`
- **出力**: `dist/`フォルダ
- **最適化**: コード分割、Tree Shaking

## 📝 メンテナンス時の注意点

### 1. 依存関係更新
- React, TailwindCSS, Rsbuildの最新版を定期チェック
- create-rstackライブラリの互換性確認
- shadcn/uiの新機能・変更点の反映

### 2. テンプレート追加手順
1. `template-[name]/`ディレクトリ作成
2. `src/index.ts`のoptions配列に追加
3. `create()`のtemplates配列に追加
4. `package.json`のfilesフィールド確認

### 3. バージョン管理
- Semantic Versioningに準拠
- CHANGELOG.mdの更新
- package.jsonのバージョン更新

### 4. テスト方法
```bash
# ローカルテスト
pnpm create file:. -d test-app
cd test-app && pnpm install && pnpm dev

# 各テンプレートのテスト
pnpm create file:. -d test-react --template react-ts
pnpm create file:. -d test-router --template tanstack-router
```

## 📋 v1.4.0の主要変更点

### 依存関係更新
- **TailwindCSS**: v4.1.8 → v4.1.10
- **lucide-react**: v0.511.0 → v0.515.0  
- **@tanstack/react-router**: v1.120.13 → v1.121.12
- **@rsbuild/plugin-react**: v1.3.1 → v1.3.2
- その他マイナーバージョンアップデート

### TanStack Router重要な変更
- **ルートファイル構造変更**: lazy routesから直接routesに変更
  - `about.lazy.tsx` → `about.tsx`
  - `index.lazy.tsx` → `index.tsx`
  - API: `createLazyFileRoute` → `createFileRoute`
- **プラグイン設定更新**: `TanStackRouterRspack()` → `tanstackRouter({target: 'react', autoCodeSplitting: true})`
- **DevToolsパッケージ名変更**: `@tanstack/router-devtools` → `@tanstack/react-router-devtools`
- **自動生成ルートツリー**: 構造が大幅に変更

### ビルド設定追加
- **pnpm設定**: `@tailwindcss/oxide`の依存関係管理を追加
- **Rspack設定**: HTMLアセット処理ルールを追加

## 🔍 今後の改善可能性

### 短期的改善
- [ ] Next.jsテンプレートの追加
- [ ] Viteテンプレートの追加
- [ ] ESLint/Prettier設定の標準化

### 長期的改善
- [ ] カスタムテンプレート機能
- [ ] 設定ウィザードの追加
- [ ] プロジェクト更新コマンド

## 📊 使用統計・フィードバック

### 人気テンプレート
1. react-ts（標準、最も使用される）
2. tanstack-router（ルーティング必要時）

### よくある問題
1. ポート8080の競合
2. pnpmがインストールされていない
3. Node.jsバージョンの非互換

## 🎯 品質保証チェックリスト

- [ ] 全テンプレートが正常に生成される
- [ ] 生成されたプロジェクトがエラーなくビルドできる
- [ ] shadcn/uiコンポーネントが追加できる
- [ ] TypeScriptエラーが発生しない
- [ ] 開発サーバーが正常に起動する
- [ ] ドキュメントが最新の状態である

---

**最終更新**: 2025年12月15日  
**次回メンテナンス推奨**: 3ヶ月後（依存関係更新チェック）
