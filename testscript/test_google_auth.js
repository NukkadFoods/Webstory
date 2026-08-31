/**
 * Zero-dependency Google Service Account JWT & API Tester
 */
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

const keyFilePath = '/Users/ajaytiwari/Downloads/deploymate-507121-02865c36d808.json';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function requestPost(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = typeof data === 'string' ? data : JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: body }));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function requestGet(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: body }));
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('=== Google Service Account Authentication & AdSense Test ===\n');

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Service Account Email:', serviceAccount.client_email);

    // 1. Create JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/adsense.readonly https://www.googleapis.com/auth/cloud-platform',
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

    // 2. Exchange JWT for Google Access Token
    console.log('\nExchanging JWT for Google Access Token...');
    const postBody = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const tokenRes = await requestPost('https://oauth2.googleapis.com/token', postBody);

    const tokenData = JSON.parse(tokenRes.data);
    if (!tokenData.access_token) {
      console.error('❌ Failed to get access token:', tokenData);
      return;
    }

    console.log('✅ Access Token generated successfully!');
    console.log('Token Type:', tokenData.token_type);
    console.log('Expires in:', tokenData.expires_in, 'seconds');

    // 3. Query AdSense Management API
    console.log('\n--- 1. Querying AdSense Management API (v2) ---');
    const adsenseRes = await requestGet('https://adsense.googleapis.com/v2/accounts', tokenData.access_token);
    console.log(`HTTP Status: ${adsenseRes.status}`);
    console.log('AdSense Response:', adsenseRes.data);

    // 4. Query AdSense Ad Units
    console.log('\n--- 2. Querying Google Cloud Services Discovery ---');
    const discoveryRes = await requestGet('https://serviceusage.googleapis.com/v1/projects/deploymate-507121/services?filter=state:ENABLED', tokenData.access_token);
    console.log(`HTTP Status: ${discoveryRes.status}`);
    try {
      const enabledServices = JSON.parse(discoveryRes.data);
      if (enabledServices.services) {
        console.log('Enabled APIs in project:');
        enabledServices.services.forEach(s => {
          console.log(` - ${s.config.title} (${s.config.name})`);
        });
      } else {
        console.log(discoveryRes.data);
      }
    } catch (e) {
      console.log(discoveryRes.data);
    }

  } catch (err) {
    console.error('Execution error:', err);
  }
}

run();
