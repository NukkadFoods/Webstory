/**
 * Google Search Console & Indexing CLI for forexyy.com
 * Includes: Sitemap submissions, URL Inspection, Search Analytics, Indexing API
 */
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

const keyFilePath = '/Users/ajaytiwari/Downloads/deploymate-507121-02865c36d808.json';
const domainSite = 'sc-domain:forexyy.com';

const SITEMAPS = [
  'https://forexyy.com/sitemap.xml',
  'https://forexyy.com/news-sitemap.xml',
  'https://forexyy.com/video-sitemap.xml'
];

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getServiceAccountToken() {
  return new Promise((resolve, reject) => {
    const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
    const signInput = `${encodedHeader}.${encodedClaimSet}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = base64UrlEncode(signer.sign(serviceAccount.private_key));
    const jwt = `${signInput}.${signature}`;

    const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.access_token) {
            resolve(json.access_token);
          } else {
            reject(new Error(JSON.stringify(json)));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function requestJson(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function listSites(token) {
  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: '/webmasters/v3/sites',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function listSitemaps(token) {
  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: `/webmasters/v3/sites/${encodeURIComponent(domainSite)}/sitemaps`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function submitSitemapUrl(token, url) {
  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: `/webmasters/v3/sites/${encodeURIComponent(domainSite)}/sitemaps/${encodeURIComponent(url)}`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function inspectUrl(token, inspectionUrl) {
  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: '/v1/urlInspection/index:inspect',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    inspectionUrl: inspectionUrl,
    siteUrl: domainSite
  });
}

async function getSearchAnalytics(token, days = 28) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: `/webmasters/v3/sites/${encodeURIComponent(domainSite)}/searchAnalytics/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: 20
  });
}

async function getTopPages(token, days = 28) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: `/webmasters/v3/sites/${encodeURIComponent(domainSite)}/searchAnalytics/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    startDate,
    endDate,
    dimensions: ['page'],
    rowLimit: 10
  });
}

async function publishUrlToIndexingApi(token, url) {
  return requestJson({
    hostname: 'indexing.googleapis.com',
    path: '/v3/urlNotifications:publish',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    url: url,
    type: 'URL_UPDATED'
  });
}

async function main() {
  console.log('====================================================');
  console.log('  🔍 Google Search Console Advanced Optimization     ');
  console.log('  Target: forexyy.com                                ');
  console.log('====================================================\n');

  try {
    const token = await getServiceAccountToken();
    console.log('✅ Authenticated with Google Cloud Service Account\n');

    // 1. Submit All Core Sitemaps
    console.log('🔹 [1/4] Submitting & Verifying All Sitemaps:');
    for (const sm of SITEMAPS) {
      await submitSitemapUrl(token, sm);
      console.log(`   📤 Submitted: ${sm}`);
    }

    const sitemaps = await listSitemaps(token);
    console.log('\n   Active Sitemaps in Search Console:');
    if (sitemaps.sitemap && sitemaps.sitemap.length > 0) {
      sitemaps.sitemap.forEach(sm => {
        console.log(`   - ${sm.path}`);
        console.log(`     Last Downloaded: ${sm.lastDownloaded || 'Queued'}`);
        console.log(`     Errors: ${sm.errors || 0} | Warnings: ${sm.warnings || 0}`);
      });
    }

    // 2. URL Inspection on Homepage & Key Pages
    console.log('\n🔹 [2/4] Live URL Inspection (Googlebot Coverage & Rich Results):');
    const testUrls = [
      'https://forexyy.com/',
      'https://forexyy.com/category/business'
    ];

    for (const u of testUrls) {
      try {
        const inspection = await inspectUrl(token, u);
        const result = inspection.inspectionResult;
        if (result) {
          const indexStatus = result.indexStatusResult || {};
          console.log(`   🔍 URL: ${u}`);
          console.log(`      Verdict: ${indexStatus.verdict || 'Unknown'}`);
          console.log(`      Coverage: ${indexStatus.coverageState || 'Pending'}`);
          console.log(`      Robots.txt: ${indexStatus.robotsTxtState || 'Unknown'}`);
          console.log(`      Last Crawl: ${indexStatus.lastCrawlTime || 'Not crawled yet'}`);
        } else {
          console.log(`   🔍 URL: ${u} - Inspection queued / not indexed yet`);
        }
      } catch (e) {
        console.log(`   ⚠️ Inspection for ${u}: ${e.message}`);
      }
    }

    // 3. Search Analytics - Top Queries
    console.log('\n🔹 [3/4] Search Analytics - Top Queries:');
    const analytics = await getSearchAnalytics(token, 28);
    if (analytics.rows && analytics.rows.length > 0) {
      console.log('   ┌─────────────────────────────────┬────────┬─────────────┬────────┬──────────┐');
      console.log('   │ Query                           │ Clicks │ Impressions │ CTR    │ Position │');
      console.log('   ├─────────────────────────────────┼────────┼─────────────┼────────┼──────────┤');
      analytics.rows.forEach(r => {
        const query = (r.keys[0] || '').padEnd(31).substring(0, 31);
        const clicks = String(r.clicks).padStart(6);
        const imps = String(r.impressions).padStart(11);
        const ctr = `${(r.ctr * 100).toFixed(1)}%`.padStart(6);
        const pos = r.position.toFixed(1).padStart(8);
        console.log(`   │ ${query} │ ${clicks} │ ${imps} │ ${ctr} │ ${pos} │`);
      });
      console.log('   └─────────────────────────────────┴────────┴─────────────┴────────┴──────────┘');
    } else {
      console.log('   No search query data yet.');
    }

    // 4. Indexing API Instant Notification Test
    console.log('\n🔹 [4/4] Google Indexing API Test:');
    const indexResult = await publishUrlToIndexingApi(token, 'https://forexyy.com/');
    if (indexResult.urlNotificationMetadata) {
      console.log('   ✅ Successfully notified Google Indexing API for instant crawl of https://forexyy.com/');
      console.log(`   Notify Time: ${indexResult.urlNotificationMetadata.latestUpdate?.notifyTime}`);
    } else {
      console.log('   Response:', indexResult);
    }

    console.log('\n====================================================');
    console.log('✅ Google Search Console Optimization Run Complete');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Search Console Optimization Error:', err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getServiceAccountToken,
  submitSitemapUrl,
  inspectUrl,
  publishUrlToIndexingApi,
  getSearchAnalytics
};
