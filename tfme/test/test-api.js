#!/usr/bin/env node

/**
 * Terraform Registry API v2 - Filter Parameter Test (Initial Version)
 *
 * 目的:
 *   provider-docsエンドポイントで使用可能なフィルターパラメータを調査する
 *
 * テスト内容:
 *   1. プロバイダーバージョンID取得
 *   2. 通常の検索（filter[category]のみ）
 *   3. filter[slug]パラメータのサポート確認
 *   4. filter[title]などの他のパラメータのテスト
 *
 * 使い方:
 *   node test/test-api.js
 *
 * 注意:
 *   このバージョンはv2 APIのバージョンソート問題があり、
 *   正しいprovider version IDを取得できない可能性がある。
 *   より正確なテストは test-filter-slug.js を参照。
 *
 * 作成日: 2025-11-17
 */

const provider = 'aws';
const namespace = 'hashicorp';
const resourceSlug = 'vpc'; // aws_vpc のslug部分

async function testAPI() {
  try {
    // Step 1: プロバイダーバージョンID取得
    console.log('Step 1: Getting provider version ID...');
    const versionsUrl = `https://registry.terraform.io/v2/providers/${namespace}/${provider}/provider-versions`;
    const versionsRes = await fetch(versionsUrl);
    const versionsData = await versionsRes.json();

    const latestVersion = versionsData.data[0];
    const versionId = latestVersion.id;
    console.log(`  Version ID: ${versionId}`);
    console.log(`  Version: ${latestVersion.attributes.version}\n`);

    // Step 2: 通常の検索（全件取得）
    console.log('Step 2: Normal search (all docs)...');
    const normalUrl = new URL('https://registry.terraform.io/v2/provider-docs');
    normalUrl.searchParams.set('filter[provider-version]', versionId);
    normalUrl.searchParams.set('filter[category]', 'resources');
    normalUrl.searchParams.set('page[size]', '10'); // テストのため少なめ

    console.log(`  URL: ${normalUrl}`);
    const normalRes = await fetch(normalUrl);
    const normalData = await normalRes.json();
    console.log(`  Result: ${normalData.data.length} docs found`);
    console.log(`  First doc slug: ${normalData.data[0]?.attributes.slug}\n`);

    // Step 3: filter[slug]でのフィルタリングを試す
    console.log(`Step 3: Testing filter[slug]=${resourceSlug}...`);
    const slugUrl = new URL('https://registry.terraform.io/v2/provider-docs');
    slugUrl.searchParams.set('filter[provider-version]', versionId);
    slugUrl.searchParams.set('filter[category]', 'resources');
    slugUrl.searchParams.set('filter[slug]', resourceSlug);

    console.log(`  URL: ${slugUrl}`);
    const slugRes = await fetch(slugUrl);
    const slugData = await slugRes.json();

    if (slugData.data && slugData.data.length > 0) {
      console.log('  ✅ filter[slug] is SUPPORTED!');
      console.log(`  Result: ${slugData.data.length} docs found`);
      console.log(`  Slug: ${slugData.data[0].attributes.slug}`);
      console.log(`  Title: ${slugData.data[0].attributes.title}`);
      console.log(`  ID: ${slugData.data[0].id}`);
    } else {
      console.log('  ❌ filter[slug] is NOT supported or returned no results');
      console.log(`  Response: ${JSON.stringify(slugData, null, 2).slice(0, 500)}`);
    }

    // Step 4: 他のフィルターパラメータも試す
    console.log('\nStep 4: Testing other filter parameters...');

    // filter[title]を試す
    const titleUrl = new URL('https://registry.terraform.io/v2/provider-docs');
    titleUrl.searchParams.set('filter[provider-version]', versionId);
    titleUrl.searchParams.set('filter[title]', 'aws_vpc');
    const titleRes = await fetch(titleUrl);
    const titleData = await titleRes.json();
    console.log(`  filter[title]: ${titleData.data?.length || 0} docs found`);

  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
