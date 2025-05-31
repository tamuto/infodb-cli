# create-myproj

> 🚀 Rspackを用いたモダンなReactプロジェクトを瞬時に作成するスキャフォールディングツール

**create-myproj**は、TailwindCSS、shadcn/ui、TypeScriptが事前設定された高性能なReactプロジェクトテンプレートを提供します。最新のビルドツール**Rspack**により、高速な開発体験を実現します。

[![npm version](https://badge.fury.io/js/@infodb%2Fcreate-myproj.svg)](https://badge.fury.io/js/@infodb%2Fcreate-myproj)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 主な機能

- **⚡️ Rspack** - webpackの代替となる超高速ビルドツール
- **🎨 TailwindCSS** - ユーティリティファーストなCSSフレームワーク  
- **🧱 shadcn/ui** - 美しく再利用可能なUIコンポーネント群
- **⚛️ React 19** - 最新のReactライブラリ
- **📘 TypeScript** - 型安全性とIntelliSenseサポート
- **📦 pnpm** - 高速で効率的なパッケージマネージャー
- **🛣️ TanStack Router** - モダンなクライアントサイドルーティング（オプション）
- **🎯 事前設定済み** - 面倒な初期設定が不要

## 🚀 クイックスタート

### 基本的な使用方法

```bash
# プロジェクトの作成
pnpm create @infodb/myproj@latest -d my-app

# ディレクトリに移動
cd my-app

# 依存関係のインストール
pnpm install

# 開発サーバーの起動（ポート8080）
pnpm dev
```

### インタラクティブモード

テンプレートを選択しながら作成する場合：

```bash
# テンプレート選択画面が表示されます
pnpm create @infodb/myproj@latest

# プロジェクト名を指定
? Enter project name: › my-awesome-app
? Select a template › 
❯ React with TypeScript
  TanStack Router
```

## 📋 利用可能なテンプレート

### 🎯 React with TypeScript (`react-ts`)

標準的なReact + TypeScriptプロジェクトテンプレート

**含まれる技術スタック:**
- React 19 + TypeScript
- TailwindCSS 4.1.8
- shadcn/ui (New York style)
- Rspack (Rsbuild)
- PostCSS

**適用ケース:**
- シンプルなSPAアプリケーション
- プロトタイプ開発
- 小〜中規模のWebアプリ

### 🛣️ TanStack Router (`tanstack-router`)

クライアントサイドルーティング機能付きテンプレート

**含まれる技術スタック:**
- 上記のreact-tsに加えて
- TanStack Router 1.120.13
- Router DevTools
- ファイルベースルーティング

**適用ケース:**
- 複数ページのWebアプリケーション
- SPA with ルーティング
- 大規模なフロントエンドアプリ

## 📁 プロジェクト構造

生成されるプロジェクトの構造：

```
my-app/
├── public/                  # 静的アセット
├── src/
│   ├── app/                 # メインアプリケーション
│   │   └── App.tsx         # ルートコンポーネント
│   ├── components/         # 再利用可能なコンポーネント
│   │   └── ui/            # shadcn/uiコンポーネント（追加時）
│   ├── lib/
│   │   └── utils.ts       # ユーティリティ関数（cn等）
│   ├── routes/            # TanStackRouterのルート（該当テンプレートのみ）
│   ├── globals.css        # グローバルスタイル + TailwindCSS
│   └── main.tsx           # アプリケーションエントリーポイント
├── .gitignore              # Git除外設定
├── components.json         # shadcn/ui設定ファイル
├── index.html              # HTMLテンプレート
├── package.json            # プロジェクト設定・依存関係
├── postcss.config.js       # PostCSS設定
├── README.md               # プロジェクト説明
├── rsbuild.config.ts       # Rspack/Rsbuild設定
├── tailwind.config.js      # TailwindCSS設定
└── tsconfig.json           # TypeScript設定
```

## 🎨 shadcn/uiコンポーネントの使用

### コンポーネントの追加

```bash
# 人気のコンポーネントを追加
pnpx shadcn@latest add button
pnpx shadcn@latest add card
pnpx shadcn@latest add input
pnpx shadcn@latest add form

# 一度に複数追加
pnpx shadcn@latest add button card input form
```

### 使用例

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MyComponent() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## 🛠️ 開発コマンド

```bash
# 開発サーバーの起動（ホットリロード付き）
pnpm dev

# プロダクションビルド
pnpm build

# ビルド結果のプレビュー
pnpm preview

# 型チェック
pnpm type-check

# shadcn/uiコンポーネント追加
pnpx shadcn@latest add [component-name]

# 依存関係の更新
pnpm update
```

## ⚙️ カスタマイズ

### TailwindCSSの設定

`tailwind.config.js`でカスタムテーマを設定：

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // カスタムカラーを追加
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
```

### Rspack設定のカスタマイズ

`rsbuild.config.ts`でビルド設定を調整：

```ts
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: "./src/main.tsx" },
    alias: {
      '@': './src',  // パスエイリアス
    }
  },
  dev: {
    port: 3000,  // ポート変更
  },
  html: {
    template: "./index.html",
  },
});
```

### 環境変数の使用

`.env`ファイルを作成してAPIキーなどを管理：

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My Awesome App
```

```tsx
// src/config.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appTitle: import.meta.env.VITE_APP_TITLE,
}
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### ❌ ポート8080が既に使用中

```bash
# 別のポートを指定
pnpm dev --port 3000
```

または`rsbuild.config.ts`で設定：

```ts
export default defineConfig({
  dev: {
    port: 3000,
  },
  // ...
});
```

#### ❌ shadcn/uiコンポーネントが見つからない

```bash
# components.jsonが正しく設定されているか確認
cat components.json

# パスエイリアスが正しく設定されているか確認
# tsconfig.json の compilerOptions.paths を確認
```

#### ❌ TailwindCSSスタイルが適用されない

1. `src/globals.css`でTailwindディレクティブが正しく記述されているか確認：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. `main.tsx`で正しくインポートされているか確認：

```tsx
import './globals.css'
```

#### ❌ TypeScriptエラー

```bash
# 型定義の再生成
pnpm type-check

# node_modulesとlock fileを削除して再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 🚀 パフォーマンス最適化

### バンドルサイズの最適化

```ts
// rsbuild.config.ts
export default defineConfig({
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
  tools: {
    bundlerChain: (chain) => {
      chain.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
          },
        },
      });
    },
  },
});
```

### 画像最適化

```ts
// rsbuild.config.ts
export default defineConfig({
  tools: {
    rspack: {
      module: {
        rules: [
          {
            test: /\.(png|jpe?g|gif|svg)$/,
            type: 'asset',
            parser: {
              dataUrlCondition: {
                maxSize: 8 * 1024, // 8kb
              },
            },
          },
        ],
      },
    },
  },
});
```

## 📖 詳細情報

### 参考リンク

- [Rspack Documentation](https://rspack.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Router](https://tanstack.com/router)
- [React 19 Documentation](https://react.dev/)

### バージョン要件

- **Node.js**: 18.0.0以上
- **pnpm**: 8.0.0以上推奨

## 🤝 コントリビューション

プロジェクトの改善にご協力いただけるすべての方を歓迎しています！

### 報告・提案

- [Issues](https://github.com/tamuto/infodb-cli/issues) - バグ報告や機能提案
- [Pull Requests](https://github.com/tamuto/infodb-cli/pulls) - コード貢献

### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/tamuto/infodb-cli.git
cd infodb-cli/create-myproj

# 依存関係をインストール
pnpm install

# 開発モードでビルド
pnpm dev

# ローカルでテスト
pnpm create file:. -d test-app
```

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルをご確認ください。

## 👥 クレジット

**create-myproj**は[create-rstack](https://www.npmjs.com/package/create-rstack)をベースに構築されています。

---

**Author**: tamuto <tamuto@infodb.jp>  
**Repository**: [infodb-cli](https://github.com/tamuto/infodb-cli)
