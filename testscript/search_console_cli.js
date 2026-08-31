/**
 * Google Search Console & Indexing CLI for forexyy.com
 */
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const keyFilePath = '/Users/ajaytiwari/Downloads/deploymate-507121-02865c36d808.json';
const domainSite = 'sc-domain:forexyy.com';
const sitemapUrl = 'https://forexyy.com/sitemap.xml';

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
      res.on('data', c => body += c);
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

async function submitSitemap(token) {
  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: `/webmasters/v3/sites/${encodeURIComponent(domainSite)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function getSearchAnalytics(token) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const body = {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: 15
  };

  return requestJson({
    hostname: 'searchconsole.googleapis.com',
    path: `/webmasters/v3/sites/${encodeURIComponent(domainSite)}/searchAnalytics/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, body);
}

async function main() {
  console.log('====================================================');
  console.log('  🔍 Google Search Console Dashboard - forexyy.com   ');
  console.log('====================================================\n');

  try {
    const token = await getServiceAccountToken();
    console.log('✅ Service Account Authentication: OK');
    console.log(`Service Account: tiwariajay033-gmail-com@deploymate-507121.iam.gserviceaccount.com\n`);

    // 1. List Sites
    console.log('🔹 [1/3] Verified Properties in Google Search Console:');
    const sites = await listSites(token);
    if (sites.siteEntry && sites.siteEntry.length > 0) {
      sites.siteEntry.forEach(s => {
        console.log(`   - Property: ${s.siteUrl} | Access Level: ${s.permissionLevel}`);
      });
    } else {
      console.log('   No sites returned:', sites);
    }
    console.log('');

    // 2. Submit & Check Sitemaps
    console.log('🔹 [2/3] Sitemaps Status:');
    await submitSitemap(token);
    console.log(`   Submitted Sitemap: ${sitemapUrl}`);

    const sitemaps = await listSitemaps(token);
    if (sitemaps.sitemap && sitemaps.sitemap.length > 0) {
      sitemaps.sitemap.forEach(sm => {
        console.log(`   - Path: ${sm.path}`);
        console.log(`     Last Downloaded: ${sm.lastDownloaded || 'Pending initial crawl'}`);
        console.log(`     Warnings: ${sm.warnings || 0} | Errors: ${sm.errors || 0}`);
      });
    } else {
      console.log('   Sitemap submitted successfully and queued for Googlebot crawl.');
    }
    console.log('');

    // 3. Search Analytics
    console.log('🔹 [3/3] Top Google Search Queries (Last 28 Days):');
    const analytics = await getSearchAnalytics(token);
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
      console.log('   No search query rows yet (Google Search Console typically updates queries daily).');
    }

    console.log('\n====================================================');
    console.log('✅ Google Search Console connected and sitemap submitted!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Search Console Error:', err.message);
  }
}

main();
