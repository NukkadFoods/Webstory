/**
 * Batch Google Indexing Submitter
 * Reads all URLs from live sitemaps and submits them to Google Indexing API
 */
const https = require('https');
const { getServiceAccountToken, publishUrlToIndexingApi } = require('./search_console_cli');

function fetchUrlWithRedirects(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlWithRedirects(res.headers.location).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchSitemapUrls(sitemapUrl) {
  const xml = await fetchUrlWithRedirects(sitemapUrl);
  const matches = xml.match(/<loc>\s*(https:\/\/[^<\s]+)\s*<\/loc>/gi) || [];
  return matches.map(m => m.replace(/<\/?loc>/gi, '').trim());
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('====================================================');
  console.log('  🚀 Batch Indexing Submitter - Google Indexing API  ');
  console.log('====================================================\n');

  try {
    const token = await getServiceAccountToken();
    console.log('✅ Authenticated with Google Cloud Service Account');

    const sitemapsToCrawl = [
      'https://forexyy.com/sitemap.xml',
      'https://forexyy.com/news-sitemap.xml'
    ];

    const allUrls = new Set();

    for (const sm of sitemapsToCrawl) {
      console.log(`📥 Fetching URLs from ${sm}...`);
      const urls = await fetchSitemapUrls(sm);
      console.log(`   Found ${urls.length} URLs in ${sm}`);
      urls.forEach(u => allUrls.add(u));
    }

    const uniqueUrls = Array.from(allUrls);
    console.log(`\n🎯 Total unique URLs to submit: ${uniqueUrls.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      process.stdout.write(`[${i + 1}/${uniqueUrls.length}] Pushing: ${url.substring(0, 65)}... `);

      try {
        const res = await publishUrlToIndexingApi(token, url);
        if (res.urlNotificationMetadata) {
          console.log('✅ SUBMITTED');
          successCount++;
        } else {
          console.log(`⚠️ ${JSON.stringify(res)}`);
          errorCount++;
        }
      } catch (e) {
        console.log(`❌ ${e.message}`);
        errorCount++;
      }

      // Respect Google Indexing API rate limits (~5 requests/sec)
      await delay(200);
    }

    console.log('\n====================================================');
    console.log(`🎉 Batch Indexing Complete!`);
    console.log(`   Total URLs Submitted to Google: ${successCount}`);
    console.log(`   Errors/Skipped: ${errorCount}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Batch Indexing Error:', err.message);
  }
}

main();
