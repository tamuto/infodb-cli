# Changelog

このファイルでは、create-myprojの全ての注目すべき変更を記録しています。

このフォーマットは[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に基づいており、このプロジェクトは[Semantic Versioning](https://semver.org/spec/v2.0.0.html)に準拠しています。

## [1.3.0] - 2025-05-31

### 追加
- 包括的なREADME.mdドキュメント
  - 詳細なセットアップガイド
  - テンプレート比較と適用ケース
  - shadcn/uiコンポーネントの使用例
  - トラブルシューティングガイド
  - パフォーマンス最適化のヒント
  - カスタマイズ方法（TailwindCSS、Rspack、環境変数）
- CHANGELOGファイル（バージョン履歴管理）
- CLAUDE.md（Claudeメンテナンス用分析ドキュメント）

### 改善
- template-common/README.mdの大幅改善
  - shadcn/uiコンポーネント追加ガイド
  - TailwindCSSの活用方法
  - 開発のヒントとベストプラクティス
  - デプロイガイド（Vercel、Netlify）

### 技術仕様
- React 19.1.0サポート
- TailwindCSS 4.1.8対応
- Rsbuild 1.3.22（Rspackベース）
- shadcn/ui New Yorkスタイル
- TanStack Router 1.120.13
- TypeScript 5.6.3

### 依存関係更新
- `@rsbuild/core`: ^1.3.22
- `@rsbuild/plugin-react`: ^1.3.1
- `@tailwindcss/postcss`: ^4.1.8
- `react`: ^19.1.0
- `react-dom`: ^19.1.0
- `@tanstack/react-router`: ^1.120.13（TanStack Routerテンプレート）
- `@tanstack/router-devtools`: ^1.120.13（TanStack Routerテンプレート）
- `@tanstack/router-plugin`: ^1.120.13（TanStack Routerテンプレート）

---

## リリースタイプの説明

- **追加** - 新機能
- **変更** - 既存機能の変更
- **非推奨** - 近い将来削除される機能
- **削除** - 削除された機能
- **修正** - バグ修正
- **セキュリティ** - 脆弱性への対応

## バージョニング規則

このプロジェクトは[Semantic Versioning](https://semver.org/spec/v2.0.0.html)に従います：

- **MAJOR版**: 非互換なAPI変更
- **MINOR版**: 後方互換性を保つ新機能
- **PATCH版**: 後方互換性を保つバグ修正
