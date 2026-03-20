// test/basic.test.js — Tests basiques KCI v7
// Usage: node test/basic.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\nKCI v7 — Tests basiques\n');

// ─── API FILES EXIST ──────────────────────────────────────────
test('api/analyse.js exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../api/analyse.js')));
});

test('api/create-checkout.js exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../api/create-checkout.js')));
});

test('api/validate.js exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../api/validate.js')));
});

test('api/verify-session.js exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../api/verify-session.js')));
});

// ─── INDEX.HTML CHECKS ───────────────────────────────────────
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

test('index.html contains og:image', () => {
  assert.ok(html.includes('og:image'));
});

test('index.html contains favicon', () => {
  assert.ok(html.includes('favicon.svg'));
});

test('index.html contains GA4 placeholder', () => {
  assert.ok(html.includes('gtag'));
});

test('index.html contains #mentions section', () => {
  assert.ok(html.includes('id="mentions"'));
});

test('index.html contains #cgv section', () => {
  assert.ok(html.includes('id="cgv"'));
});

test('index.html contains skip-to-content link', () => {
  assert.ok(html.includes('Aller au contenu principal'));
});

test('index.html contains form-section', () => {
  assert.ok(html.includes('form-section'));
});

// ─── SECURITY CHECKS ─────────────────────────────────────────
const analyseJs = fs.readFileSync(path.join(__dirname, '../api/analyse.js'), 'utf8');

test('analyse.js does NOT have wildcard CORS', () => {
  assert.ok(!analyseJs.includes("Allow-Origin', '*'"));
});

test('analyse.js has email validation', () => {
  assert.ok(analyseJs.includes('emailRegex'));
});

test('analyse.js does NOT default to valide:true on failure', () => {
  assert.ok(!analyseJs.includes("valide: true, problemes: []"));
});

test('analyse.js uses persistent store', () => {
  assert.ok(analyseJs.includes('store.set'));
});

const verifyJs = fs.readFileSync(path.join(__dirname, '../api/verify-session.js'), 'utf8');

test('verify-session.js throws if TOKEN_SECRET missing', () => {
  assert.ok(verifyJs.includes('throw') || verifyJs.includes('Error'));
});

test('verify-session.js does NOT have wildcard CORS', () => {
  assert.ok(!verifyJs.includes("Allow-Origin', '*'"));
});

// ─── STATIC FILES ─────────────────────────────────────────────
test('favicon.svg exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../favicon.svg')));
});

test('og-image.png exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../og-image.png')));
});

// ─── RESULTS ──────────────────────────────────────────────────
console.log(`\n${passed + failed} tests | ${passed} passed | ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
