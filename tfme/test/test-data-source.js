#!/usr/bin/env node

/**
 * Terraform Registry API - Resource vs Data Source Test
 *
 * 目的:
 *   同じ名前のResourceとData Sourceが両方存在することを確認し、
 *   categoryパラメータで区別できることを実証する
 *
 * テスト内容:
 *   1. Provider version ID取得
 *   2. filter[category]=resources で検索
 *   3. filter[category]=data-sources で検索
 *   4. 両方が存在するか確認
 *
 * 使い方:
 *   node test/test-data-source.js
 *
 * 重要な発見:
 *   ✅ aws_vpc はResourceとData Sourceの両方が存在する
 *   ✅ 同じslugでもcategoryで区別できる
 *   ⚠️  自動判定では区別できないため、明示的な指定が必要
 *
 * この結果に基づき、CLIオプションを改善:
 *   変更前: -r <name> のみ (常にresourcesを取得)
 *   変更後: -r <name> または -d <name> で明示的に指定
 *
 * 作成日: 2025-11-17
 * 関連: src/commands/download.ts, src/index.ts
 */

async function testDataSource() {
  const namespace = 'hashicorp';
  const provider = 'aws';
  const slug = 'vpc'; // aws_vpc

  try {
    // Step 1: Provider version ID取得
    console.log('Step 1: Getting provider version ID...');
    const versionUrl = `https://registry.terraform.io/v2/providers/${namespace}/${provider}/provider-versions`;
    const versionRes = await fetch(versionUrl, {
      headers: {
        'User-Agent': 'tfme/0.2.0',
        'Accept': 'application/json',
      }
    });

    const versionData = await versionRes.json();
    const versions = versionData.data.map(pv => ({
      id: pv.id,
      version: pv.attributes.version
    })).sort((a, b) => b.version.localeCompare(a.version));

    const latestVersion = versions[0];
    console.log(`  Version: ${latestVersion.version}`);
    console.log(`  ID: ${latestVersion.id}\n`);

    // Step 2: Resourceを取得
    console.log(`Step 2: Getting RESOURCE 'aws_vpc'...`);
    const resourceUrl = new URL('https://registry.terraform.io/v2/provider-docs');
    resourceUrl.searchParams.set('filter[provider-version]', latestVersion.id);
    resourceUrl.searchParams.set('filter[category]', 'resources');
    resourceUrl.searchParams.set('filter[slug]', slug);

    const resourceRes = await fetch(resourceUrl.toString(), {
      headers: {
        'User-Agent': 'tfme/0.2.0',
        'Accept': 'application/json',
      }
    });

    const resourceData = await resourceRes.json();
    if (resourceData.data && resourceData.data.length > 0) {
      console.log(`  ✅ Resource found!`);
      console.log(`    - Category: ${resourceData.data[0].attributes.category}`);
      console.log(`    - Slug: ${resourceData.data[0].attributes.slug}`);
      console.log(`    - Title: ${resourceData.data[0].attributes.title}`);
      console.log(`    - ID: ${resourceData.data[0].id}\n`);
    } else {
      console.log(`  ❌ Resource NOT found\n`);
    }

    // Step 3: Data Sourceを取得
    console.log(`Step 3: Getting DATA SOURCE 'aws_vpc'...`);
    const dataSourceUrl = new URL('https://registry.terraform.io/v2/provider-docs');
    dataSourceUrl.searchParams.set('filter[provider-version]', latestVersion.id);
    dataSourceUrl.searchParams.set('filter[category]', 'data-sources');
    dataSourceUrl.searchParams.set('filter[slug]', slug);

    const dataSourceRes = await fetch(dataSourceUrl.toString(), {
      headers: {
        'User-Agent': 'tfme/0.2.0',
        'Accept': 'application/json',
      }
    });

    const dataSourceData = await dataSourceRes.json();
    if (dataSourceData.data && dataSourceData.data.length > 0) {
      console.log(`  ✅ Data Source found!`);
      console.log(`    - Category: ${dataSourceData.data[0].attributes.category}`);
      console.log(`    - Slug: ${dataSourceData.data[0].attributes.slug}`);
      console.log(`    - Title: ${dataSourceData.data[0].attributes.title}`);
      console.log(`    - ID: ${dataSourceData.data[0].id}\n`);
    } else {
      console.log(`  ❌ Data Source NOT found\n`);
    }

    // Step 4: 結論
    console.log('Step 4: Conclusion');
    const hasResource = resourceData.data && resourceData.data.length > 0;
    const hasDataSource = dataSourceData.data && dataSourceData.data.length > 0;

    if (hasResource && hasDataSource) {
      console.log('  🎯 Both Resource AND Data Source exist with the same name!');
      console.log('  ⚠️  Current implementation cannot distinguish between them.');
      console.log('  💡 Need to add --type option to download command.');
    } else if (hasResource) {
      console.log('  📌 Only Resource exists.');
    } else if (hasDataSource) {
      console.log('  📌 Only Data Source exists.');
    } else {
      console.log('  ❓ Neither found.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testDataSource();
