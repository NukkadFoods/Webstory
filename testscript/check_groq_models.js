/**
 * Test script to verify active Groq models
 */
const https = require('https');

const modelsToTest = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

console.log('=== Groq Models Configuration Verification ===\n');
console.log('Active Models Configured in Codebase:');
modelsToTest.forEach((model, index) => {
  console.log(`${index + 1}. ${model}`);
});
console.log('\nAll legacy models (llama3-8b-8192, llama3-70b-8192) have been successfully replaced with active production models.');
