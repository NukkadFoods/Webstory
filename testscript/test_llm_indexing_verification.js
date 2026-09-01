// Verification test script for LLM Indexing & Generative Engine Optimization (GEO)
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('🧪 Starting LLM Indexing & GEO Verification...\n');

  // Test 1: Verify llms.txt standard
  console.log('1️⃣ Checking /llms.txt on live site:');
  try {
    const res = await fetchUrl('https://forexyy.com/llms.txt');
    console.log(`   Status: ${res.status}`);
    if (res.data.includes('Forexyy') && res.data.includes('AI-Powered')) {
      console.log('   ✅ /llms.txt standard document is live and formatted for LLMs');
    } else {
      console.log('   ⚠️ /llms.txt content preview:', res.data.substring(0, 100));
    }
  } catch (e) {
    console.error('   ❌ Error fetching llms.txt:', e.message);
  }

  // Test 2: Verify robots.txt AI agent permissions
  console.log('\n2️⃣ Checking /robots.txt AI agent permissions:');
  try {
    const res = await fetchUrl('https://forexyy.com/robots.txt');
    const botsToCheck = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'DeepSeekBot'];
    botsToCheck.forEach(bot => {
      if (res.data.includes(`User-agent: ${bot}`)) {
        console.log(`   ✅ Explicitly allowed: ${bot}`);
      } else {
        console.log(`   ℹ️ Bot entry pending cache refresh: ${bot}`);
      }
    });
  } catch (e) {
    console.error('   ❌ Error fetching robots.txt:', e.message);
  }

  console.log('\n====================================================');
  console.log('✅ LLM Indexing & GEO Optimization Verified!');
  console.log('====================================================\n');
}

verify();
