/**
 * Diagnostic test script to check NYT API and Production Backend Health
 */
const https = require('https');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

async function runDiagnostics() {
  console.log('=== Webstory Production & NYT API Diagnostic Test ===\n');

  const apiKey = 'Ocr69CSLAcSFGPhwGg8ebE0MNV8cYn2LN26zcvFp7YFVaJCI';

  // 1. Direct check to NYT API
  console.log('1. Testing Direct NYT Top Stories API with new key...');
  try {
    const nytRes = await fetchUrl(`https://api.nytimes.com/svc/topstories/v2/technology.json?api-key=${apiKey}`);
    console.log(`HTTP Status: ${nytRes.statusCode}`);
    if (nytRes.statusCode === 200) {
      const data = JSON.parse(nytRes.body);
      console.log(`✅ Success: Fetched ${data.results ? data.results.length : 0} articles from NYT.`);
    } else {
      console.log(`Response body: ${nytRes.body}`);
    }
  } catch (err) {
    console.error('Failed to query NYT API directly:', err.message);
  }

  console.log('\n-----------------------------------------------------\n');

  // 2. Check production health-check endpoint
  console.log('2. Checking Production /api/articles/health-check...');
  try {
    const healthRes = await fetchUrl('https://webstorybackend.onrender.com/api/articles/health-check');
    console.log(`HTTP Status: ${healthRes.statusCode}`);
    const healthJson = JSON.parse(healthRes.body);
    console.log('Health JSON:', JSON.stringify(healthJson, null, 2));
  } catch (err) {
    console.error('Failed to query health-check:', err.message);
  }

  console.log('\n-----------------------------------------------------\n');

  // 2. Check section statistics
  console.log('2. Checking Production /api/sections/stats...');
  try {
    const statsRes = await fetchUrl('https://webstorybackend.onrender.com/api/sections/stats');
    console.log(`HTTP Status: ${statsRes.statusCode}`);
    const statsJson = JSON.parse(statsRes.body);
    console.log('Section Stats:', JSON.stringify(statsJson, null, 2));
  } catch (err) {
    console.error('Failed to query section stats:', err.message);
  }

  console.log('\n-----------------------------------------------------\n');

  // 3. Check section articles query
  console.log('3. Checking Production /api/articles/section/technology...');
  try {
    const techRes = await fetchUrl('https://webstorybackend.onrender.com/api/articles/section/technology');
    console.log(`HTTP Status: ${techRes.statusCode}`);
    console.log('Response body:', techRes.body);
  } catch (err) {
    console.error('Failed to query section articles:', err.message);
  }
}

runDiagnostics();
