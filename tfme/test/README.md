# Terraform Registry API Tests

このディレクトリには、Terraform Registry API v2の調査・検証用テストスクリプトが含まれています。

## 概要

tfmeの`download`コマンドを最適化するために、Terraform Registry APIの仕様を調査した際のテストスクリプトです。これらのスクリプトは、APIの動作を理解し、未公開のパラメータやエンドポイントの挙動を確認するために作成されました。

## 背景

### 問題点

tfmeの`download`コマンドは、当初以下のような非効率な実装でした：

```typescript
// 全件取得（16ページ、1,617件のドキュメント）
const docs = await this.getProviderDocsList(providerVersionId, category);
// 配列から検索
const doc = docs.find(d => d.attributes.slug === slug);
```

**課題:**
- 1つのリソースを取得するために16回のAPIリクエストが必要
- 1,617件のドキュメントをメモリに保持
- レート制限待機時間による遅延

### 解決策

これらのテストスクリプトにより、`filter[slug]`パラメータが使用可能であることを発見：

```typescript
// 直接取得（1リクエスト）
const doc = await this.getProviderDocBySlug(providerVersionId, category, slug);
```

**改善結果:**
- ✅ APIリクエスト: 16回 → 1回
- ✅ 処理時間: ~8秒 → ~0.5秒
- ✅ メモリ使用量: 1,617件 → 1件

## テストファイル

### 1. test-api.js

**目的:** 初期調査 - フィルターパラメータのサポート確認

**テスト内容:**
- `filter[slug]`パラメータの動作確認
- `filter[title]`などの他のパラメータのテスト
- 基本的なAPI構造の理解

**実行方法:**
```bash
node test/test-api.js
```

**注意:**
バージョンソートの問題があり、正しいprovider version IDを取得できない可能性があります。より正確なテストには`test-filter-slug.js`を使用してください。

---

### 2. test-api2.js

**目的:** V1とV2 APIの比較調査

**テスト内容:**
- サービスディスカバリー (`.well-known/terraform.json`)
- V1 APIによるプロバイダーバージョン取得
- V2 APIによるプロバイダーバージョン取得
- V1とV2の違いと互換性の確認

**実行方法:**
```bash
node test/test-api2.js
```

**発見事項:**
- V1とV2でバージョン情報の形式が異なる
- V2のprovider-versionsエンドポイントが正しいバージョンIDを返す
- provider-docsエンドポイントには有効なversion IDが必要

---

### 3. test-filter-slug.js ⭐ **推奨**

**目的:** `filter[slug]`パラメータの実証と検証

**テスト内容:**
1. 正しいprovider version IDの取得（バージョンソート付き）
2. 通常の検索（1ページ目のみ）で対象リソースの有無を確認
3. `filter[slug]`パラメータで直接取得を試行
4. 取得結果の比較と検証

**実行方法:**
```bash
node test/test-filter-slug.js
```

**期待される出力:**
```
Step 1: Getting provider version ID...
  Latest Version: 6.9.0
  Version ID: 76520

Step 2: Normal search (first page only)...
  Result: 100 docs in first page
  ⚠️  'vpc' NOT in first page

Step 3: Testing filter[slug]=vpc...
  ✅ filter[slug] WORKS!
  Found 1 doc(s)
    [0] Slug: vpc, Title: vpc, ID: 9652881

🎉 SUCCESS! We can use filter[slug] to get specific resource directly!
```

**関連実装:**
- `src/utils/registry-client.ts:getProviderDocBySlug()`

---

### 4. test-data-source.js ⭐ **重要**

**目的:** ResourceとData Sourceの区別確認

**テスト内容:**
1. 同じ名前（aws_vpc）でResourceとData Sourceの両方を取得
2. `filter[category]`パラメータで区別できることを確認
3. 両方が存在する場合の問題点を明確化

**実行方法:**
```bash
node test/test-data-source.js
```

**期待される出力:**
```
Step 1: Getting provider version ID...
  Version: 6.9.0
  ID: 76520

Step 2: Getting RESOURCE 'aws_vpc'...
  ✅ Resource found!
    - Category: resources
    - Slug: vpc
    - Title: vpc
    - ID: 9652881

Step 3: Getting DATA SOURCE 'aws_vpc'...
  ✅ Data Source found!
    - Category: data-sources
    - Slug: vpc
    - Title: vpc
    - ID: 9651429

Step 4: Conclusion
  🎯 Both Resource AND Data Source exist with the same name!
  ⚠️  Current implementation cannot distinguish between them.
  💡 Need to add --type option to download command.
```

**重要な発見:**
- ✅ 同じ名前でResourceとData Sourceの両方が存在する
- ✅ IDとcategoryで区別される
- ⚠️ 自動判定では区別不可能

**実装への影響:**
この発見に基づき、CLIオプションを改善しました：
- 変更前: `-r <name>` のみ（常にresourcesを取得）
- 変更後: `-r <name>` または `-d <name>` で明示的に指定

**関連実装:**
- `src/commands/download.ts`
- `src/index.ts`

---

## API エンドポイント仕様

### Base URL
```
https://registry.terraform.io
```

### 主要エンドポイント

#### 1. Provider Versions
```
GET /v2/providers/{namespace}/{name}/provider-versions
```

**レスポンス例:**
```json
{
  "data": [
    {
      "id": "76520",
      "type": "provider-versions",
      "attributes": {
        "version": "6.9.0"
      }
    }
  ]
}
```

#### 2. Provider Docs (全件取得)
```
GET /v2/provider-docs?filter[provider-version]={id}&filter[category]={category}&page[size]={size}&page[number]={page}
```

**パラメータ:**
- `filter[provider-version]`: プロバイダーバージョンID（必須）
- `filter[category]`: `resources` or `data-sources`（任意）
- `page[size]`: 1ページあたりの件数（デフォルト: 100）
- `page[number]`: ページ番号（デフォルト: 1）

#### 3. Provider Docs (直接取得) ⭐ **最適化**
```
GET /v2/provider-docs?filter[provider-version]={id}&filter[category]={category}&filter[slug]={slug}
```

**パラメータ:**
- `filter[provider-version]`: プロバイダーバージョンID（必須）
- `filter[category]`: `resources` or `data-sources`（必須）
- `filter[slug]`: リソースのslug（必須）
  - 例: `aws_vpc` → slug: `vpc`

**レスポンス例:**
```json
{
  "data": [
    {
      "id": "9652881",
      "type": "provider-docs",
      "attributes": {
        "slug": "vpc",
        "title": "vpc",
        "category": "resources"
      }
    }
  ]
}
```

## 今後の調査項目

今後、APIの仕様を調査する際は、以下の項目も確認してください：

1. **他のフィルターパラメータ**
   - `filter[title]`は使えるか？
   - `filter[path]`は使えるか？
   - 複数のslugを一度に取得できるか？

2. **パフォーマンス**
   - レート制限の詳細（requests/second）
   - 大量リクエスト時の挙動
   - キャッシュヘッダーの有無

3. **エラーハンドリング**
   - 存在しないslugの場合のレスポンス
   - 無効なprovider version IDの場合
   - 認証エラーの扱い

4. **その他のエンドポイント**
   - `/v2/provider-docs/{id}`の詳細
   - プロバイダーメタデータの取得方法
   - バージョン履歴の取得

## 参考資料

### 公式ドキュメント
- [Terraform Registry API Documentation](https://developer.hashicorp.com/terraform/registry/api-docs)
- [Provider Registry Protocol](https://developer.hashicorp.com/terraform/internals/provider-registry-protocol)

### 関連実装
- `src/utils/registry-client.ts` - RegistryClientクラス
- `src/commands/download.ts` - downloadコマンド

### 関連Issue/PR
- 最適化前の実装の問題点についての議論
- パフォーマンス改善のPR

---

**作成日:** 2025-11-17
**最終更新:** 2025-11-17
**メンテナー:** tfme開発チーム

## 使用上の注意

- これらのテストスクリプトはAPIの調査・検証用です
- 本番環境では使用しないでください
- Terraform Registry APIにはレート制限があります
- テスト実行時は適切な間隔を空けてください

## ライセンス

tfmeプロジェクトと同じMITライセンスです。
