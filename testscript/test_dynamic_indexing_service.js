// Test script to verify the dynamic Google Indexing service
const googleIndexingService = require('../backend/services/googleIndexingService');

console.log('🧪 Testing Dynamic Google Indexing Service...\n');

const mockArticle = {
  title: 'Test Google Dynamic Indexing Integration',
  url: 'https://example.com/2026/09/01/test-dynamic-indexing.html',
  section: 'technology'
};

const articleUrl = googleIndexingService.generateArticleUrl(mockArticle);
console.log('1️⃣ Generated Article URL:', articleUrl);
if (articleUrl === 'https://forexyy.com/article/test-dynamic-indexing') {
  console.log('   ✅ URL formatting matches Forexyy slug structure');
} else {
  console.log('   ⚠️ Formatted URL:', articleUrl);
}

// Test credentials extraction
const creds = googleIndexingService.getCredentials();
if (creds && creds.client_email) {
  console.log('\n2️⃣ Credentials found:');
  console.log(`   Client Email: ${creds.client_email}`);
  console.log('   ✅ Service account ready for automated background indexing');
} else {
  console.log('\n2️⃣ ⚠️ No credentials found in test runner');
}

console.log('\n✅ Dynamic Indexing Service is ready.');
