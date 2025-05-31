# Rspack Project

このプロジェクトは[create-myproj](https://www.npmjs.com/package/@infodb/create-myproj)によって生成されました。

> ⚡️ **Rspack** + **React 19** + **TailwindCSS** + **shadcn/ui** を使用した現代的なWebアプリケーション

## 🚀 クイックスタート

### 開発環境の起動

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動（http://localhost:8080）
pnpm dev
```

### プロダクションビルド

```bash
# 最適化されたビルドを作成
pnpm build

# ビルド結果をプレビュー
pnpm preview
```

## 🎨 shadcn/uiコンポーネントの追加

プロジェクトにはshadcn/uiが事前設定されています。以下のコマンドで美しいコンポーネントを追加できます：

```bash
# 基本的なコンポーネントを追加
pnpx shadcn@latest add button
pnpx shadcn@latest add card
pnpx shadcn@latest add input
pnpx shadcn@latest add form

# 利用可能なコンポーネント一覧を確認
pnpx shadcn@latest add
```

### 使用例

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ExampleComponent() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Welcome!</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Get Started</Button>
      </CardContent>
    </Card>
  )
}
```

## 🛠️ 開発のヒント

### TailwindCSSクラスの活用

```tsx
// レスポンシブデザイン
<div className="w-full md:w-1/2 lg:w-1/3">
  <h1 className="text-2xl md:text-4xl font-bold">
    Responsive Heading
  </h1>
</div>

// ダークモード対応
<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
  Dark mode ready!
</div>
```

### カスタムカラーの設定

`tailwind.config.js`でブランドカラーを追加：

```js
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    },
  },
}
```

### 環境変数の使用

`.env`ファイルでAPIエンドポイントなどを管理：

```bash
REACT_APP_API_URL=https://api.example.com
REACT_APP_NAME=My Awesome App
```

```tsx
// 使用例
const apiUrl = process.env.REACT_APP_API_URL
```

## 📚 詳細情報

- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Rspack Documentation](https://rspack.dev/)
- [create-myproj GitHub](https://github.com/tamuto/infodb-cli/tree/main/create-myproj)

---

**Happy coding! 🎉**
