/**
 * Google AdSense OAuth2 Helper & Reporting Tool
 */
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

const clientSecretPath = '/Users/ajaytiwari/Downloads/client_secret_61395463498-frn1ln5bn1dbkk6n7mve6rmb21vd7k5e.apps.googleusercontent.com.json';
const tokenSavePath = '/Users/ajaytiwari/Desktop/Projects/webstory/testscript/adsense_token.json';

const clientData = JSON.parse(fs.readFileSync(clientSecretPath, 'utf8')).web;
const clientId = clientData.client_id;
const clientSecret = clientData.client_secret;
const redirectUri = 'http://localhost:8085/oauth2callback';

function getAuthUrl() {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/adsense.readonly');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

function exchangeCodeForTokens(code) {
  return new Promise((resolve, reject) => {
    const postData = `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&grant_type=authorization_code`;

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function queryAdSenseAccounts(accessToken) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'adsense.googleapis.com',
      path: '/v2/accounts',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function startOAuthFlow() {
  console.log('=== Google AdSense OAuth2 Authorization ===\n');

  // Check if token already saved
  if (fs.existsSync(tokenSavePath)) {
    try {
      const savedToken = JSON.parse(fs.readFileSync(tokenSavePath, 'utf8'));
      if (savedToken.access_token) {
        console.log('Found existing saved token. Testing AdSense query...');
        const accounts = await queryAdSenseAccounts(savedToken.access_token);
        console.log('AdSense Accounts:', JSON.stringify(accounts, null, 2));
        return;
      }
    } catch (e) {
      // Continue with login flow
    }
  }

  const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    if (reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.query.code;
      if (code) {
        try {
          const tokens = await exchangeCodeForTokens(code);
          fs.writeFileSync(tokenSavePath, JSON.stringify(tokens, null, 2));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Successful!</h1><p>You can close this tab and return to the terminal.</p>');

          console.log('\n✅ OAuth2 Token Received and saved to adsense_token.json');
          console.log('\n--- Querying AdSense Accounts ---');
          const accounts = await queryAdSenseAccounts(tokens.access_token);
          console.log('AdSense Accounts Data:', JSON.stringify(accounts, null, 2));

          server.close();
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Error: ${err.message}`);
          console.error('Token exchange error:', err);
        }
      }
    }
  });

  server.listen(8085, () => {
    console.log('Open this link in your browser to sign in with your AdSense Google Account (snapthinktrader@gmail.com):\n');
    console.log(getAuthUrl());
    console.log('\nWaiting for authentication callback on http://localhost:8085/oauth2callback ...\n');
  });
}

startOAuthFlow();
