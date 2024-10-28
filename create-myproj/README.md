# create-myproj

Rspackを用いたReactプロジェクトを迅速に作成するためのスキャフォールディングツールです。TailwindCSSとshadcn/uiが設定済みの最新のプロジェクト環境を提供します。

## 機能

- ⚡️ **Rspack** - webpackの代替となる高速なビルドツール
- 🎨 **TailwindCSS** - ユーティリティファーストなCSSフレームワーク
- 🧱 **shadcn/ui** - 再利用可能なUIコンポーネント群
- ⚛️ **React** - モダンなUIライブラリ
- 📦 **pnpm** - 高速で効率的なパッケージマネージャー

## クイックスタート

```bash
# プロジェクトの作成
pnpm create @infodb/myproj@latest -d my-app

# ディレクトリに移動
cd my-app

# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev
```

## 作成されるディレクトリ構造

```
my-app/
├── src/
│   ├── app/
│   │   └── App.tsx      # メインのアプリケーションコンポーネント
│   ├── components/      # 一旦、空のフォルダ(shadcn/uiのコンポーネント等が追加される)
│   ├── lib/
│   │   └── utils.ts     # ユーティリティ関数
│   ├── global.css       # グローバルスタイル
│   └── main.tsx         # エントリーポイント
├── .gitignore           # Gitの設定
├── package.json         # プロジェクトの設定
├── README.md            # プロジェクトの説明
├── index.html           # HTMLテンプレート
├── components.json      # shadcn/ui設定
├── rspack.config.js     # Rspack設定
├── tailwind.config.js   # TailwindCSS設定
├── postcss.config.js    # PostCSS設定
└── tsconfig.json        # TypeScript設定
```

## スクリプト

```bash
# 開発サーバーの起動
pnpm dev

# プロダクションビルド
pnpm build
```

## shadcn/uiコンポーネントの追加

```bash
# 新しいコンポーネントの追加
pnpx shadcn@latest add button
```

## ライセンス

MIT License
