#!/usr/bin/env node

/**
 * Terraform Registry API - V1/V2 Comparison Test
 *
 * 目的:
 *   Terraform Registry APIのV1とV2エンドポイントの違いを調査し、
 *   サービスディスカバリーから provider-docs までの完全なフローを確認する
 *
 * テスト内容:
 *   1. サービスディスカバリー (.well-known/terraform.json)
 *   2. V1 API によるプロバイダーバージョン取得
 *   3. V2 API によるプロバイダーバージョン取得
 *   4. provider-docs エンドポイントの動作確認
 *   5. filter[slug]パラメータのテスト
 *
 * 使い方:
 *   node test/test-api2.js
 *
 * 発見事項:
 *   - V1とV2でバージョン情報の形式が異なる
 *   - V2のprovider-versionsは正しいバージョンIDを返す
 *   - provider-docsエンドポイントは有効なversion IDが必要
 *
 * 作成日: 2025-11-17
 */

async function testAPI() {
  try {
    // Step 1: サービスディスカバリー
    console.log('Step 1: Service Discovery...');
    const discoveryUrl = 'https://registry.terraform.io/.well-known/terraform.json';
    const discoveryRes = await fetch(discoveryUrl);
    const discoveryData = await discoveryRes.json();
    console.log('  Providers v1:', discoveryData['providers.v1']);
    console.log('  Modules v1:', discoveryData['modules.v1'], '\n');

    // Step 2: プロバイダーバージョン一覧の取得
    console.log('Step 2: Get AWS provider versions...');
    const providersUrl = 'https://registry.terraform.io/v1/providers/hashicorp/aws/versions';
    const providersRes = await fetch(providersUrl);
    const providersData = await providersRes.json();
    console.log(`  Latest version: ${providersData.versions[0]?.version}`);
    console.log(`  Total versions: ${providersData.versions?.length}\n`);

    // Step 3: V2 API で provider-versions を確認
    console.log('Step 3: V2 Provider Versions API...');
    const v2VersionsUrl = 'https://registry.terraform.io/v2/providers/hashicorp/aws/provider-versions';
    const v2VersionsRes = await fetch(v2VersionsUrl);

    if (!v2VersionsRes.ok) {
      console.log(`  Status: ${v2VersionsRes.status}`);
      const errorText = await v2VersionsRes.text();
      console.log(`  Error: ${errorText.slice(0, 200)}\n`);
    } else {
      const v2VersionsData = await v2VersionsRes.json();
      console.log(`  Status: ${v2VersionsRes.status} OK`);

      if (v2VersionsData.data && v2VersionsData.data.length > 0) {
        const latest = v2VersionsData.data[0];
        console.log(`  Latest version ID: ${latest.id}`);
        console.log(`  Latest version: ${latest.attributes?.version}`);

        const versionId = latest.id;

        // Step 4: provider-docs API テスト
        console.log('\nStep 4: Testing provider-docs API...');
        const docsUrl = new URL('https://registry.terraform.io/v2/provider-docs');
        docsUrl.searchParams.set('filter[provider-version]', versionId);
        docsUrl.searchParams.set('filter[category]', 'resources');
        docsUrl.searchParams.set('page[size]', '5');

        console.log(`  URL: ${docsUrl}`);
        const docsRes = await fetch(docsUrl);
        const docsData = await docsRes.json();

        if (docsData.data && docsData.data.length > 0) {
          console.log(`  ✅ Found ${docsData.data.length} docs`);
          console.log(`  Sample doc:`);
          console.log(`    - Slug: ${docsData.data[0].attributes.slug}`);
          console.log(`    - Title: ${docsData.data[0].attributes.title}`);
          console.log(`    - ID: ${docsData.data[0].id}`);

          // Step 5: filter[slug]をテスト
          console.log('\nStep 5: Testing filter[slug]...');
          const slugUrl = new URL('https://registry.terraform.io/v2/provider-docs');
          slugUrl.searchParams.set('filter[provider-version]', versionId);
          slugUrl.searchParams.set('filter[category]', 'resources');
          slugUrl.searchParams.set('filter[slug]', 'vpc');

          console.log(`  URL: ${slugUrl}`);
          const slugRes = await fetch(slugUrl);
          const slugData = await slugRes.json();

          if (slugData.data && slugData.data.length > 0) {
            console.log(`  ✅ filter[slug] WORKS!`);
            console.log(`  Found ${slugData.data.length} doc(s)`);
            console.log(`    - Slug: ${slugData.data[0].attributes.slug}`);
            console.log(`    - Title: ${slugData.data[0].attributes.title}`);
          } else {
            console.log(`  ❌ filter[slug] returned no results`);
          }
        } else {
          console.log(`  ❌ No docs found`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
