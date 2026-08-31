/**
 * Direct AdSense OAuth Client for Project deploymate-507121
 */
const http = require('http');
const https = require('https');
const fs = require('fs');

const clientSecretPath = '/Users/ajaytiwari/Downloads/client_secret_61395463498-frn1ln5bn1dbkk6n7mve6rmb21vd7k5e.apps.googleusercontent.com.json';
const tokenFile = '/Users/ajaytiwari/Desktop/Projects/webstory/testscript/project_adsense_token.json';

const clientData = JSON.parse(fs.readFileSync(clientSecretPath, 'utf8')).web;
const clientId = clientData.client_id;
const clientSecret = clientData.client_secret;
const redirectUri = 'http://localhost:8085/oauth2callback';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/adsense.readonly https://www.googleapis.com/auth/userinfo.email')}&access_type=offline&prompt=consent`;

function exchangeCode(code) {
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: 'parse_error', body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getAdSenseAccounts(accessToken) {
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: 'parse_error', body });
        }
      });
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:8085');
  const code = reqUrl.searchParams.get('code');

  if (code) {
    try {
      console.log('\n📥 Received Authorization Code from Google!');
      const tokens = await exchangeCode(code);
      fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));

      if (tokens.access_token) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 60px;">
            <h1 style="color: #2e7d32; font-size: 28px;">🎉 Google AdSense Connected!</h1>
            <p style="font-size: 16px; color: #555;">You can close this tab and return to the terminal.</p>
          </div>
        `);

        console.log('✅ Token saved to project_adsense_token.json');
        console.log('\n--- Querying Live AdSense Accounts ---');
        const accounts = await getAdSenseAccounts(tokens.access_token);
        console.log('AdSense Accounts Data:');
        console.log(JSON.stringify(accounts, null, 2));

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 2000);
      } else {
        console.error('❌ Token Error:', tokens);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Token Error: ${JSON.stringify(tokens)}`);
      }

    } catch (err) {
      console.error('Error during exchange:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error: ${err.message}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Waiting for Google authorization...');
  }
});

server.listen(8085, () => {
  console.log('=== Ready for Project OAuth Login ===\n');
  console.log('AUTH URL:');
  console.log(authUrl);
  console.log('\nListening on http://localhost:8085 ...\n');
});
