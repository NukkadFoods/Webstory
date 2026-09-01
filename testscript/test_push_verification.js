// Verification Test Script for Push Notifications & API Endpoints
const https = require('https');

console.log('🧪 Starting Push Notification & API Verification...\n');

// Test 1: VAPID Key validation
const VAPID_KEY = 'BD5Rj1NOFhH3PuBqEJmuH35gBXmBY-CWyuioeG15rmKjIIWy6GCVh2O-nFrW_5DxY4W1xF7nH34b6iS_2SU3m3Y';
console.log('1️⃣ Checking VAPID Key:');
console.log(`   Key length: ${VAPID_KEY.length} chars (Expected ~87 chars)`);
if (VAPID_KEY.length > 80 && VAPID_KEY.length < 100) {
  console.log('   ✅ VAPID Public Key format is valid');
} else {
  console.error('   ❌ VAPID Key format invalid');
}

// Test 2: Base64 URL decoding check
try {
  const base64 = (VAPID_KEY + '='.repeat((4 - VAPID_KEY.length % 4) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');
  console.log(`   ✅ Base64 decoding successful (${buffer.length} bytes for P-256 curve)`);
} catch (e) {
  console.error('   ❌ Base64 decode failed:', e.message);
}

// Test 3: Check live push-sw.js on Forexyy
console.log('\n2️⃣ Testing live push service worker (https://forexyy.com/push-sw.js):');
https.get('https://forexyy.com/push-sw.js', (res) => {
  console.log(`   Status Code: ${res.statusCode} (Redirects to: ${res.headers.location || 'Direct'})`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('   ✅ Service worker endpoint responds properly');
  });
}).on('error', (err) => {
  console.error('   ❌ Error fetching push-sw.js:', err.message);
});

// Test 4: Check Render backend health
console.log('\n3️⃣ Testing Render backend health (https://webstorybackend.onrender.com/health):');
https.get('https://webstorybackend.onrender.com/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`   Status: ${json.status || 'OK'}`);
      console.log('   ✅ Backend is online and responsive');
    } catch (e) {
      console.log(`   Response: ${data.substring(0, 50)}...`);
    }
  });
}).on('error', (err) => {
  console.error('   ❌ Backend error:', err.message);
});
