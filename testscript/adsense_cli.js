/**
 * Google AdSense CLI & Reporting Tool for Snap Think Trader
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const tokenPath = path.join(__dirname, 'snap_adsense_token.json');
const clientId = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com';
const clientSecret = 'd-FL95Q19q7MQmFpd7hHD0Ty';
const projectId = 'deploymate-507121';
const accountName = 'accounts/pub-1825834035687372';

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const creds = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const postData = `client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${creds.refresh_token}&grant_type=refresh_token`;

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

function apiRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'adsense.googleapis.com',
      path: endpoint,
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-goog-user-project': projectId,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
  });
}

async function main() {
  console.log('====================================================');
  console.log('   📊 Google AdSense Dashboard - Snap Think Trader   ');
  console.log('====================================================\n');

  try {
    const token = await getAccessToken();

    // 1. Fetch Account Details
    console.log('🔹 [1/3] Account Details:');
    const accountInfo = await apiRequest(`/v2/${accountName}`, token);
    console.log(`   Account ID:   ${accountInfo.name}`);
    console.log(`   Display Name: ${accountInfo.displayName}`);
    console.log(`   Status:       ${accountInfo.state}`);
    console.log(`   Time Zone:    ${accountInfo.timeZone?.id}`);
    console.log(`   Created:      ${accountInfo.createTime}\n`);

    // 2. Fetch Sites
    console.log('🔹 [2/3] Registered Sites:');
    const sitesInfo = await apiRequest(`/v2/${accountName}/sites`, token);
    if (sitesInfo.sites && sitesInfo.sites.length > 0) {
      sitesInfo.sites.forEach((site, i) => {
        console.log(`   ${i + 1}. Domain: ${site.domain} | State: ${site.state} | Auto Ads: ${site.autoAdsEnabled ? 'Enabled' : 'Disabled'}`);
      });
    } else {
      console.log('   No custom sites found or default AdSense site list empty.');
    }
    console.log('');

    // 3. Fetch Ad Clients & Ad Units
    console.log('🔹 [3/3] Ad Clients & Units:');
    const adClientsInfo = await apiRequest(`/v2/${accountName}/adclients`, token);
    if (adClientsInfo.adClients && adClientsInfo.adClients.length > 0) {
      for (const client of adClientsInfo.adClients) {
        console.log(`   Product: ${client.productCode} (${client.name})`);
        
        // Fetch ad units for this client
        const adUnits = await apiRequest(`/v2/${client.name}/adunits`, token);
        if (adUnits.adUnits && adUnits.adUnits.length > 0) {
          adUnits.adUnits.forEach(unit => {
            console.log(`     - [Ad Unit] ${unit.displayName} | State: ${unit.state}`);
          });
        }
      }
    } else {
      console.log('   No ad clients found.');
    }
    // 4. Fetch Performance / Earnings Report
    console.log('🔹 [4/4] Performance & Earnings Report (Last 7 Days):');
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 7);

    const reportQuery = `/v2/${accountName}/reports:generate?dateRange=LAST_7_DAYS&metrics=ESTIMATED_EARNINGS&metrics=PAGE_VIEWS&metrics=IMPRESSIONS&metrics=CLICKS&metrics=PAGE_VIEWS_CTR&metrics=PAGE_VIEWS_RPM`;
    const report = await apiRequest(reportQuery, token);

    if (report.totals) {
      const cells = report.totals.cells || [];
      console.log('   ┌───────────────────────┬──────────────┐');
      console.log(`   │ Estimated Earnings    │ $${cells[0]?.value || '0.00'}        │`);
      console.log(`   │ Page Views            │ ${cells[1]?.value || '0'}            │`);
      console.log(`   │ Impressions           │ ${cells[2]?.value || '0'}            │`);
      console.log(`   │ Clicks                │ ${cells[3]?.value || '0'}            │`);
      console.log(`   │ Page CTR              │ ${((cells[4]?.value || 0) * 100).toFixed(2)}%        │`);
      console.log(`   │ Page RPM              │ $${cells[5]?.value || '0.00'}        │`);
      console.log('   └───────────────────────┴──────────────┘');
    } else {
      console.log('   No report rows returned for the specified period.');
    }

    console.log('\n====================================================');
    console.log('✅ Connection verified and ready for CLI & MCP use!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ AdSense CLI Error:', err.message);
  }
}

main();
